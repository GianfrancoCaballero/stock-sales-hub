

## Plan: Modulo de Ventas y Reorganizacion del Sidebar

Este plan implementa un sistema completo de ventas con interfaz estilo POS (Punto de Venta), junto con la reorganizacion de la barra lateral para incluir acceso directo a Categorias y Usuarios.

---

### Parte 1: Reorganizacion de la Barra Lateral

**Cambios en la navegacion:**

| Seccion Actual | Nueva Estructura |
|----------------|------------------|
| Dashboard | Dashboard |
| Productos | Productos |
| Clientes | Clientes |
| Configuracion (admin) | **Ventas** (nuevo) |
| | Categorias (admin) |
| | Usuarios (admin) |

**Archivos a modificar:**
- `src/components/layout/DashboardLayout.tsx` - Agregar nuevas rutas al menu
- `src/App.tsx` - Agregar nuevas rutas

**Nuevas paginas a crear:**
- `src/pages/Sales.tsx` - Modulo principal de ventas
- `src/pages/Categories.tsx` - CRUD de categorias (extraido de Settings)
- `src/pages/Users.tsx` - Gestion de usuarios (extraido de Settings)

---

### Parte 2: Nuevas Tablas en la Base de Datos

**Tabla `sales`:**

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | uuid | Identificador unico |
| customer_id | uuid (nullable) | Cliente asociado (opcional) |
| user_id | uuid | Vendedor que realizo la venta |
| total | numeric | Monto total de la venta |
| payment_method | text | efectivo / tarjeta / transferencia |
| status | text | completada / cancelada |
| notes | text (nullable) | Notas adicionales |
| created_at | timestamp | Fecha de creacion |

**Tabla `sale_items`:**

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | uuid | Identificador unico |
| sale_id | uuid | Referencia a la venta |
| product_id | uuid | Producto vendido |
| quantity | integer | Cantidad vendida |
| unit_price | numeric | Precio unitario al momento de la venta |
| subtotal | numeric | quantity * unit_price |
| created_at | timestamp | Fecha de creacion |

**Politicas RLS:**
- Usuarios autenticados pueden ver todas las ventas
- Usuarios autenticados pueden crear ventas (con su user_id)
- Solo admins pueden actualizar/eliminar ventas (para cancelaciones)

---

### Parte 3: Pagina de Ventas (/ventas)

**Estructura con dos tabs:**

```text
+--------------------------------------------------+
|  Ventas                                          |
|  [Nueva Venta]  [Historial]                      |
+--------------------------------------------------+
```

---

### Tab 1: Nueva Venta (Interfaz POS)

**Layout en 2 columnas:**

```text
+------------------------+-------------------------+
|  BUSCAR PRODUCTOS      |  CARRITO               |
|  [_______________]     |                         |
|                        |  Producto 1     $100   |
|  +------------------+  |  [-] 2 [+]             |
|  | Goku SSJ4        |  |                         |
|  | Stock: 15        |  |  Producto 2     $80    |
|  | $120.00          |  |  [-] 1 [+]             |
|  | [Agregar]        |  |                         |
|  +------------------+  |  -----------------------|
|                        |  Cliente: [Seleccionar] |
|                        |  Pago: [Efectivo v]     |
|                        |  Notas: [___________]   |
|                        |                         |
|                        |  Subtotal: $280.00      |
|                        |  -----------------------|
|                        |  TOTAL: $280.00         |
|                        |                         |
|                        |  [COMPLETAR VENTA]      |
+------------------------+-------------------------+
```

**Funcionalidades:**
- Buscador con autocomplete por nombre o SKU
- Tarjetas de productos con stock disponible y precio
- Boton "Agregar" que suma al carrito
- Controles +/- para ajustar cantidad (no input manual)
- Indicador de stock en tiempo real
- Selector de cliente (autocomplete o "Cliente General")
- Metodo de pago: Efectivo, Tarjeta, Transferencia
- Campo de notas opcional

---

### Tab 2: Historial de Ventas

**Tabla con filtros:**

```text
+--------------------------------------------------+
|  Filtros:                                        |
|  [Fecha desde] [Fecha hasta] [Metodo] [Estado]   |
|  [Buscar cliente...]                             |
+--------------------------------------------------+
|  Fecha    | Cliente  | Vendedor | Total | Pago  |
|-----------|----------|----------|-------|-------|
|  08/02/26 | Juan P.  | Admin    | $280  | Efect |
|  07/02/26 | General  | Vendedor | $150  | Tarj  |
+--------------------------------------------------+
```

**Modal de detalle al hacer clic:**
- Datos del cliente y vendedor
- Tabla de productos vendidos
- Total de la venta
- Boton "Cancelar Venta" (solo admin, solo si completada)

---

### Parte 4: Logica de Completar Venta

**Flujo de transaccion:**

1. Validar que hay productos en el carrito
2. Validar stock suficiente de cada producto
3. Insertar registro en `sales`
4. Insertar items en `sale_items`
5. Actualizar stock de cada producto (restar cantidad)
6. Crear registros en `inventory_movements` (movement_type: 'sale')
7. Mostrar modal de exito con resumen
8. Limpiar carrito

**Validaciones:**
- No permitir cantidad mayor al stock disponible
- Warning visual si stock bajo
- Total debe ser > 0
- Loading state en boton de completar

---

### Parte 5: Cancelacion de Venta

**Solo disponible para admins:**

1. Cambiar status a 'cancelada'
2. Restaurar stock de cada producto
3. Crear movimientos de inventario inversos (movement_type: 'sale_return')
4. Toast de confirmacion

---

### Parte 6: Componentes a Crear

**Nuevos archivos:**

| Archivo | Descripcion |
|---------|-------------|
| `src/pages/Sales.tsx` | Pagina principal con tabs |
| `src/pages/Categories.tsx` | CRUD de categorias |
| `src/pages/Users.tsx` | Gestion de usuarios |
| `src/components/sales/NewSaleTab.tsx` | Interfaz POS |
| `src/components/sales/SalesHistoryTab.tsx` | Historial con filtros |
| `src/components/sales/ProductSearchCard.tsx` | Tarjeta de producto buscado |
| `src/components/sales/CartItem.tsx` | Item en el carrito |
| `src/components/sales/SaleDetailDialog.tsx` | Modal de detalle |
| `src/components/sales/SaleSuccessDialog.tsx` | Modal de exito |
| `src/hooks/useSales.ts` | React Query mutations |

---

### Parte 7: Permisos por Rol

| Accion | Vendedor | Admin |
|--------|----------|-------|
| Ver productos | Si | Si |
| Crear venta | Si | Si |
| Ver historial | Si | Si |
| Cancelar venta | No | Si |
| Gestionar categorias | No | Si |
| Gestionar usuarios | No | Si |

---

### Detalles Tecnicos

**Migracion SQL:**

```sql
-- Crear enum para metodo de pago
CREATE TYPE payment_method AS ENUM ('efectivo', 'tarjeta', 'transferencia');

-- Crear enum para estado de venta
CREATE TYPE sale_status AS ENUM ('completada', 'cancelada');

-- Tabla de ventas
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  user_id uuid NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'efectivo',
  status text NOT NULL DEFAULT 'completada',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla de items de venta
CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Politicas para sales
CREATE POLICY "Authenticated users can view sales"
  ON sales FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sales"
  ON sales FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update sales"
  ON sales FOR UPDATE TO authenticated
  USING (is_admin());

-- Politicas para sale_items
CREATE POLICY "Authenticated users can view sale items"
  ON sale_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sale items"
  ON sale_items FOR INSERT TO authenticated
  WITH CHECK (true);
```

**React Query hooks:**

```typescript
// useSales.ts - Estructura basica
- useProducts() - Lista de productos con stock
- useCustomers() - Lista de clientes
- useCreateSale() - Mutation para crear venta
- useSalesHistory() - Query con filtros
- useCancelSale() - Mutation para cancelar
```

**Componentes UI utilizados:**
- Tabs (shadcn)
- Dialog para modales
- Select para cliente y metodo de pago
- Input para busqueda
- Badge para estados
- Calendar/DatePicker para filtros de fecha
- Table para historial
- Card para productos y carrito
- Button con loading states
- Toast para notificaciones

---

### Orden de Implementacion

1. Crear tablas `sales` y `sale_items` con RLS
2. Extraer Categories y Users a paginas separadas
3. Actualizar navegacion del sidebar
4. Crear estructura base de Sales.tsx con tabs
5. Implementar NewSaleTab (busqueda + carrito)
6. Implementar logica de completar venta
7. Implementar SalesHistoryTab con filtros
8. Agregar funcionalidad de cancelacion
9. Probar flujo completo

