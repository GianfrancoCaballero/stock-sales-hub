import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  product_id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  stock_quantity: number;
  subtotal: number;
}

export interface SaleFormData {
  customer_id: string | null;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia';
  notes: string;
  items: CartItem[];
}

export interface Sale {
  id: string;
  customer_id: string | null;
  user_id: string;
  total: number;
  payment_method: string;
  status: string;
  notes: string | null;
  created_at: string;
  customer?: {
    name: string;
  } | null;
  seller?: {
    full_name: string;
  } | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: {
    name: string;
    sku: string | null;
  } | null;
}

export interface SalesFilters {
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  status?: string;
  customerSearch?: string;
}

export interface SaleUpdateData {
  customer_id?: string | null;
  payment_method?: string;
  notes?: string | null;
}

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

export function useDeleteSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No estás autenticado');

      // Get sale items to restore stock
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', saleId);

      // Get sale status
      const { data: sale } = await supabase
        .from('sales')
        .select('status')
        .eq('id', saleId)
        .single();

      // Restore stock if sale was completed
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

      // Delete sale (cascade deletes sale_items)
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
