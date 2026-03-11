import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ─── Tipos públicos ────────────────────────────────────────────────────────────

/**
 * Representa un ítem en el carrito de venta antes de confirmar la transacción.
 */
export interface CartItem {
  /** UUID del producto en `products.id`. */
  product_id: string;
  /** Nombre del producto. */
  name: string;
  /** SKU del producto, puede ser `null`. */
  sku: string | null;
  /** Cantidad a vender. */
  quantity: number;
  /** Precio unitario de venta en el momento de agregar al carrito. */
  unit_price: number;
  /** Stock disponible al agregar al carrito (para validación en UI). */
  stock_quantity: number;
  /** `quantity * unit_price`. */
  subtotal: number;
}

/**
 * Datos necesarios para crear una nueva venta.
 */
export interface SaleFormData {
  /** UUID del cliente, o `null` para "cliente general". */
  customer_id: string | null;
  /** Método de pago. */
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia';
  /** Notas opcionales para la venta. */
  notes: string;
  /** Líneas de la venta. Debe tener al menos un ítem. */
  items: CartItem[];
}

/**
 * Registro de una venta tal como se almacena en la tabla `sales`.
 */
export interface Sale {
  id: string;
  customer_id: string | null;
  user_id: string;
  total: number;
  payment_method: string;
  /** `'completada'` | `'cancelada'` */
  status: string;
  notes: string | null;
  created_at: string;
  /** JOIN con `customers(name)` — disponible en queries con select expandido. */
  customer?: { name: string } | null;
  /** Nombre del vendedor, resuelto desde `profiles`. */
  seller?: { full_name: string } | null;
}

/**
 * Línea de detalle de una venta, de la tabla `sale_items`.
 */
export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  /** JOIN con `products(name, sku)`. */
  product?: { name: string; sku: string | null } | null;
}

/**
 * Filtros aplicables al historial de ventas.
 */
export interface SalesFilters {
  /** Fecha de inicio en formato `YYYY-MM-DD`. */
  dateFrom?: string;
  /** Fecha de fin en formato `YYYY-MM-DD`. */
  dateTo?: string;
  /** `'efectivo'` | `'tarjeta'` | `'transferencia'` | `'all'` */
  paymentMethod?: string;
  /** `'completada'` | `'cancelada'` | `'all'` */
  status?: string;
  /** Texto libre para buscar por nombre de cliente. */
  customerSearch?: string;
}

/**
 * Campos actualizables en una venta existente.
 */
export interface SaleUpdateData {
  customer_id?: string | null;
  payment_method?: string;
  notes?: string | null;
}

// ─── Hooks de query ────────────────────────────────────────────────────────────

/**
 * Devuelve la lista de productos disponibles para venta (stock > 0).
 * Los campos retornados son los mínimos necesarios para el carrito:
 * `id`, `name`, `sku`, `sale_price`, `stock_quantity`, `min_stock`.
 *
 * @returns {UseQueryResult} Resultado de TanStack Query con array de productos.
 * Query key: `['products-for-sale']`
 *
 * @example
 * ```tsx
 * function ProductPicker() {
 *   const { data: products, isLoading } = useProducts();
 *   if (isLoading) return <Spinner />;
 *   return <ul>{products?.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
 * }
 * ```
 */
export function useProducts() {
  return useQuery({
    queryKey: ['products-for-sale'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, sale_price, stock_quantity, min_stock')
        .gt('stock_quantity', 0)
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Devuelve la lista completa de clientes ordenados por nombre.
 * Campos: `id`, `name`, `email`, `phone`.
 *
 * @returns {UseQueryResult} Resultado de TanStack Query con array de clientes.
 * Query key: `['customers-for-sale']`
 *
 * @example
 * ```tsx
 * const { data: customers } = useCustomers();
 * ```
 */
export function useCustomers() {
  return useQuery({
    queryKey: ['customers-for-sale'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Devuelve el historial de ventas con filtros opcionales aplicados en el servidor.
 * El filtro `customerSearch` se aplica en el cliente después del fetch.
 * Enriquece cada venta con el nombre del vendedor desde la tabla `profiles`.
 *
 * @param {SalesFilters} filters - Criterios de filtrado.
 * @returns {UseQueryResult<Sale[]>} Ventas filtradas y enriquecidas.
 * Query key: `['sales-history', filters]`
 *
 * @example
 * ```tsx
 * const { data: sales } = useSalesHistory({ dateFrom: '2025-01-01', status: 'completada' });
 * ```
 */
export function useSalesHistory(filters: SalesFilters) {
  return useQuery({
    queryKey: ['sales-history', filters],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name)
        `)
        .order('created_at', { ascending: false });

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }
      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Resuelve nombres de vendedores en una segunda query (evita joins complejos con auth.users)
      const userIds = [...new Set((data || []).map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      let filteredData = (data || []).map(sale => ({
        ...sale,
        seller: { full_name: profileMap.get(sale.user_id) || 'Usuario' },
      }));

      // Filtro de cliente en cliente (texto libre)
      if (filters.customerSearch) {
        const search = filters.customerSearch.toLowerCase();
        filteredData = filteredData.filter(sale =>
          sale.customer?.name?.toLowerCase().includes(search) ||
          (!sale.customer && 'cliente general'.includes(search))
        );
      }

      return filteredData as Sale[];
    },
  });
}

/**
 * Devuelve el detalle (líneas) de una venta específica.
 * La query solo se activa cuando `saleId` no es `null`.
 *
 * @param {string | null} saleId - UUID de la venta, o `null` para desactivar.
 * @returns {UseQueryResult<SaleItem[] | null>} Ítems de la venta.
 * Query key: `['sale-details', saleId]`
 *
 * @example
 * ```tsx
 * const [selectedId, setSelectedId] = useState<string | null>(null);
 * const { data: items } = useSaleDetails(selectedId);
 * ```
 */
export function useSaleDetails(saleId: string | null) {
  return useQuery({
    queryKey: ['sale-details', saleId],
    queryFn: async () => {
      if (!saleId) return null;

      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          *,
          product:products(name, sku)
        `)
        .eq('sale_id', saleId);

      if (error) throw error;
      return data as SaleItem[];
    },
    enabled: !!saleId,
  });
}

// ─── Hooks de mutación ─────────────────────────────────────────────────────────

/**
 * Crea una nueva venta de forma atómica (en secuencia):
 * 1. Verifica autenticación del usuario.
 * 2. Valida que el carrito no esté vacío y que el total sea mayor a 0.
 * 3. Verifica stock suficiente para cada producto.
 * 4. Inserta el registro en `sales`.
 * 5. Inserta las líneas en `sale_items`.
 * 6. Descuenta el stock en `products` por cada ítem.
 * 7. Registra un movimiento de inventario tipo `'sale'` por cada ítem.
 *
 * Al completarse, invalida las queries `products-for-sale`, `sales-history` y `products`.
 *
 * @returns {UseMutationResult} Mutation de TanStack Query. Llama `.mutate(saleData)`.
 * @throws {Error} Si el usuario no está autenticado, el carrito está vacío,
 *   el total es 0, o hay stock insuficiente para algún producto.
 *
 * @example
 * ```tsx
 * const createSale = useCreateSale();
 * createSale.mutate({
 *   customer_id: 'uuid-cliente',
 *   payment_method: 'efectivo',
 *   notes: '',
 *   items: [{ product_id: 'uuid-prod', quantity: 2, unit_price: 50, subtotal: 100, ... }],
 * });
 * ```
 */
export function useCreateSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (saleData: SaleFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No estás autenticado');

      if (saleData.items.length === 0) {
        throw new Error('El carrito está vacío');
      }

      // Validación de stock antes de insertar
      for (const item of saleData.items) {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity, name')
          .eq('id', item.product_id)
          .single();

        if (!product || product.stock_quantity < item.quantity) {
          throw new Error(`Stock insuficiente para ${product?.name || 'producto'}`);
        }
      }

      const total = saleData.items.reduce((sum, item) => sum + item.subtotal, 0);
      if (total <= 0) {
        throw new Error('El total debe ser mayor a 0');
      }

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: saleData.customer_id,
          user_id: user.id,
          total,
          payment_method: saleData.payment_method,
          notes: saleData.notes || null,
          status: 'completada',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = saleData.items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Descuento de stock y registro de movimiento por ítem
      for (const item of saleData.items) {
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (currentProduct) {
          await supabase
            .from('products')
            .update({ stock_quantity: currentProduct.stock_quantity - item.quantity })
            .eq('id', item.product_id);
        }

        await supabase
          .from('inventory_movements')
          .insert({
            product_id: item.product_id,
            user_id: user.id,
            movement_type: 'sale',
            quantity: -item.quantity,
            notes: `Venta #${sale.id.slice(0, 8)}`,
          });
      }

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-for-sale'] });
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: '¡Venta completada!',
        description: 'La venta se ha registrado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Actualiza campos editables de una venta existente (`customer_id`, `payment_method`, `notes`).
 * Solo permite cambios en ventas existentes (no modifica ítems ni totales).
 * Solo admins pueden actualizar ventas según la política RLS.
 *
 * @returns {UseMutationResult} Mutation que recibe `{ saleId: string, data: SaleUpdateData }`.
 *
 * @example
 * ```tsx
 * const updateSale = useUpdateSale();
 * updateSale.mutate({ saleId: 'uuid', data: { notes: 'Pago confirmado' } });
 * ```
 */
export function useUpdateSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ saleId, data }: { saleId: string; data: SaleUpdateData }) => {
      const { error } = await supabase
        .from('sales')
        .update(data)
        .eq('id', saleId);

      if (error) throw error;
      return saleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      toast({
        title: 'Venta actualizada',
        description: 'Los datos de la venta se han actualizado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

/**
 * Elimina una venta permanentemente.
 * Si la venta tenía estado `'completada'`, restaura el stock de todos
 * sus productos y registra movimientos de tipo `'sale_return'`.
 * La eliminación en `sales` hace cascade delete en `sale_items`.
 *
 * @returns {UseMutationResult} Mutation que recibe el `saleId: string`.
 * @throws {Error} Si el usuario no está autenticado o falla la operación en Supabase.
 *
 * @example
 * ```tsx
 * const deleteSale = useDeleteSale();
 * deleteSale.mutate('uuid-venta');
 * ```
 */
export function useDeleteSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No estás autenticado');

      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', saleId);

      const { data: sale } = await supabase
        .from('sales')
        .select('status')
        .eq('id', saleId)
        .single();

      // Restaurar stock solo si la venta estaba completada
      if (sale?.status === 'completada') {
        for (const item of saleItems || []) {
          const { data: currentProduct } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();

          if (currentProduct) {
            await supabase
              .from('products')
              .update({ stock_quantity: currentProduct.stock_quantity + item.quantity })
              .eq('id', item.product_id);
          }

          await supabase
            .from('inventory_movements')
            .insert({
              product_id: item.product_id,
              user_id: user.id,
              movement_type: 'sale_return',
              quantity: item.quantity,
              notes: `Eliminación de venta #${saleId.slice(0, 8)}`,
            });
        }
      }

      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;
      return saleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-for-sale'] });
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Venta eliminada',
        description: 'La venta y su stock han sido procesados correctamente',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

/**
 * Cancela una venta cambiando su estado a `'cancelada'` y restaurando el stock.
 * A diferencia de `useDeleteSale`, el registro de la venta se conserva en la base de datos.
 * Registra movimientos de tipo `'sale_return'` por cada ítem.
 *
 * @returns {UseMutationResult} Mutation que recibe el `saleId: string`.
 * @throws {Error} Si el usuario no está autenticado o Supabase retorna error.
 *
 * @example
 * ```tsx
 * const cancelSale = useCancelSale();
 * cancelSale.mutate('uuid-venta');
 * ```
 */
export function useCancelSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No estás autenticado');

      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', saleId);

      if (itemsError) throw itemsError;

      const { error: updateError } = await supabase
        .from('sales')
        .update({ status: 'cancelada' })
        .eq('id', saleId);

      if (updateError) throw updateError;

      // Restaurar stock y registrar movimientos de devolución
      for (const item of saleItems || []) {
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (currentProduct) {
          await supabase
            .from('products')
            .update({ stock_quantity: currentProduct.stock_quantity + item.quantity })
            .eq('id', item.product_id);
        }

        await supabase
          .from('inventory_movements')
          .insert({
            product_id: item.product_id,
            user_id: user.id,
            movement_type: 'sale_return',
            quantity: item.quantity,
            notes: `Cancelación de venta #${saleId.slice(0, 8)}`,
          });
      }

      return saleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-for-sale'] });
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Venta cancelada',
        description: 'El stock ha sido restaurado correctamente',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
