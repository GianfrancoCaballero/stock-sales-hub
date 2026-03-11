# Guía de API — Supabase (stock-sales-hub)

Este proyecto **no tiene un servidor REST propio**. Todas las operaciones de datos se realizan directamente contra la API de Supabase (PostgREST) usando el cliente `@supabase/supabase-js`. Esta guía documenta cada tabla, sus operaciones permitidas, las políticas RLS que las controlan y ejemplos de código reales del proyecto.

---

## Autenticación

Todas las operaciones (excepto las de la view `products_public` si está habilitada para `anon`) requieren un JWT válido de Supabase Auth. El cliente lo gestiona automáticamente con `persistSession: true`.

```ts
import { supabase } from '@/integrations/supabase/client';
```

El header `Authorization: Bearer <jwt>` se adjunta automáticamente a cada request.

---

## Tablas y operaciones

### `profiles`

Perfil público del usuario. Se crea automáticamente via trigger `handle_new_user` en el registro.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users.id` (único) |
| `full_name` | `text` | Nombre completo |
| `email` | `text` | Email (puede diferir de Auth) |
| `created_at` | `timestamptz` | — |
| `updated_at` | `timestamptz` | Actualizado por trigger |

#### Políticas RLS

| Operación | Rol requerido | Condición |
|---|---|---|
| SELECT | `authenticated` | Todos pueden ver todos los perfiles |
| UPDATE | `authenticated` | Solo el propio perfil (`auth.uid() = user_id`) |
| ALL | `authenticated` | Solo admins (`is_admin()`) |

#### Leer todos los perfiles

```ts
const { data, error } = await supabase
  .from('profiles')
  .select('user_id, full_name, email')
  .order('full_name');
```

#### Actualizar el propio perfil

```ts
const { error } = await supabase
  .from('profiles')
  .update({ full_name: 'Nuevo Nombre' })
  .eq('user_id', user.id);
```

---

### `user_roles`

Mapeo usuario ↔ rol. Un usuario tiene un único rol.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `auth.users.id` |
| `role` | `app_role` | `'admin'` \| `'vendedor'` |
| `created_at` | `timestamptz` | — |

#### Políticas RLS

| Operación | Rol requerido | Condición |
|---|---|---|
| SELECT | `authenticated` | Propio rol o admin |
| ALL | `authenticated` | Solo admins |

#### Leer el propio rol

```ts
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();
// data.role → 'admin' | 'vendedor'
```

#### Cambiar el rol de un usuario (solo admin)

```ts
const { error } = await supabase
  .from('user_roles')
  .update({ role: 'admin' })
  .eq('user_id', targetUserId);
```

---

### `categories`

Categorías de productos.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | Nombre único |
| `description` | `text` | Descripción opcional |
| `created_at` | `timestamptz` | — |
| `updated_at` | `timestamptz` | — |

#### Políticas RLS

| Operación | Rol requerido | Condición |
|---|---|---|
| SELECT | `authenticated` | Todos |
| INSERT / UPDATE / DELETE | `authenticated` | Solo admins |

#### Listar categorías

```ts
const { data } = await supabase
  .from('categories')
  .select('id, name, description')
  .order('name');
```

#### Crear categoría (admin)

```ts
const { data, error } = await supabase
  .from('categories')
  .insert({ name: 'Electrónica', description: 'Dispositivos electrónicos' })
  .select()
  .single();
```

**Respuesta exitosa:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Electrónica",
  "description": "Dispositivos electrónicos",
  "created_at": "2025-02-10T12:00:00Z",
  "updated_at": "2025-02-10T12:00:00Z"
}
```

**Error posible:** `23505` — nombre duplicado (UNIQUE constraint).

---

### `products`

Catálogo de productos con precios y stock.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | Nombre del producto |
| `description` | `text` | Descripción opcional |
| `sku` | `text` | Código único (nullable) |
| `category_id` | `uuid` | FK → `categories.id` (SET NULL on delete) |
| `purchase_price` | `decimal(10,2)` | Precio de costo |
| `sale_price` | `decimal(10,2)` | Precio de venta |
| `stock_quantity` | `integer` | Stock actual |
| `min_stock` | `integer` | Stock mínimo (para alertas) |
| `is_active` | `boolean` | Si el producto está activo |
| `image_url` | `text` | URL de imagen (nullable) |
| `created_at` | `timestamptz` | — |
| `updated_at` | `timestamptz` | — |

#### Políticas RLS

| Operación | Rol requerido | Condición |
|---|---|---|
| SELECT | `authenticated` | Todos |
| INSERT / UPDATE / DELETE | `authenticated` | Solo admins |

> La vista `products_public` expone los mismos campos **excepto** `purchase_price`, accesible para usuarios con rol `vendedor`.

#### Listar productos con stock > 0 (para venta)

```ts
const { data } = await supabase
  .from('products')
  .select('id, name, sku, sale_price, stock_quantity, min_stock')
  .gt('stock_quantity', 0)
  .order('name');
```

#### Crear producto (admin)

```ts
const { data, error } = await supabase
  .from('products')
  .insert({
    name: 'Auriculares BT',
    sku: 'AUR-001',
    category_id: 'uuid-categoria',
    purchase_price: 25.00,
    sale_price: 49.99,
    stock_quantity: 50,
    min_stock: 5,
  })
  .select()
  .single();
```

#### Actualizar stock (operación interna, no llamar directamente desde UI)

```ts
await supabase
  .from('products')
  .update({ stock_quantity: newStock })
  .eq('id', productId);
```

> **Nota:** En el flujo normal, el stock se actualiza automáticamente dentro de `useCreateSale`, `useDeleteSale` y `useCancelSale`. No llamar desde la UI directamente.

---

### `customers`

Registro de clientes del negocio.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | Nombre completo |
| `email` | `text` | Email (nullable) |
| `phone` | `text` | Teléfono (nullable) |
| `address` | `text` | Dirección (nullable) |
| `notes` | `text` | Notas internas (nullable) |
| `created_at` | `timestamptz` | — |
| `updated_at` | `timestamptz` | — |

#### Políticas RLS

| Operación | Rol requerido | Condición |
|---|---|---|
| SELECT | `authenticated` | Todos |
| INSERT / UPDATE / DELETE | `authenticated` | Solo admins |

#### Listar clientes

```ts
const { data } = await supabase
  .from('customers')
  .select('id, name, email, phone')
  .order('name');
```

#### Crear cliente (admin)

```ts
const { data, error } = await supabase
  .from('customers')
  .insert({
    name: 'Ana García',
    email: 'ana@example.com',
    phone: '+51 999 000 111',
  })
  .select()
  .single();
```

---

### `sales`

Cabecera de cada transacción de venta.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` | PK |
| `customer_id` | `uuid` | FK → `customers.id` (nullable — "cliente general") |
| `user_id` | `uuid` | FK → `auth.users.id` (vendedor que registró) |
| `total` | `decimal(10,2)` | Suma de todos los subtotales |
| `payment_method` | `text` | `'efectivo'` \| `'tarjeta'` \| `'transferencia'` |
| `status` | `text` | `'completada'` \| `'cancelada'` |
| `notes` | `text` | Notas opcionales |
| `created_at` | `timestamptz` | — |

#### Políticas RLS

| Operación | Rol requerido | Condición |
|---|---|---|
| SELECT | `authenticated` | Todos |
| INSERT | `authenticated` | `user_id = auth.uid()` |
| UPDATE | `authenticated` | Solo admins |
| DELETE | `authenticated` | Solo admins (implícito por política general) |

#### Listar ventas con filtros

```ts
const { data } = await supabase
  .from('sales')
  .select('*, customer:customers(name)')
  .gte('created_at', '2025-01-01')
  .lte('created_at', '2025-01-31T23:59:59')
  .eq('status', 'completada')
  .order('created_at', { ascending: false });
```

#### Crear venta

> Usar el hook `useCreateSale()` — gestiona validaciones, ítems y stock de forma atómica.

```ts
// Ejemplo directo (sin hook):
const { data: sale } = await supabase
  .from('sales')
  .insert({
    customer_id: null,          // cliente general
    user_id: user.id,
    total: 99.98,
    payment_method: 'efectivo',
    notes: null,
    status: 'completada',
  })
  .select()
  .single();
```

**Respuesta exitosa:**
```json
{
  "id": "abc12345-...",
  "customer_id": null,
  "user_id": "user-uuid",
  "total": 99.98,
  "payment_method": "efectivo",
  "status": "completada",
  "notes": null,
  "created_at": "2025-02-10T15:30:00Z"
}
```

**Errores posibles:**
- `42501` — RLS violation: el `user_id` no coincide con `auth.uid()`.
- `23503` — FK violation: `customer_id` o `user_id` inexistente.

---

### `sale_items`

Líneas de detalle de cada venta.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` | PK |
| `sale_id` | `uuid` | FK → `sales.id` (CASCADE delete) |
| `product_id` | `uuid` | FK → `products.id` |
| `quantity` | `integer` | Unidades vendidas |
| `unit_price` | `decimal(10,2)` | Precio en el momento de la venta |
| `subtotal` | `decimal(10,2)` | `quantity * unit_price` |

#### Políticas RLS

| Operación | Rol requerido | Condición |
|---|---|---|
| SELECT | `authenticated` | Todos |
| INSERT | `authenticated` | Siempre (WITH CHECK true) |

#### Leer ítems de una venta

```ts
const { data } = await supabase
  .from('sale_items')
  .select('*, product:products(name, sku)')
  .eq('sale_id', saleId);
```

---

### `inventory_movements`

Registro de auditoría de todos los cambios de stock.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `uuid` | PK |
| `product_id` | `uuid` | FK → `products.id` (CASCADE delete) |
| `user_id` | `uuid` | FK → `auth.users.id` (SET NULL) |
| `movement_type` | `text` | Ver valores posibles |
| `quantity` | `integer` | Positivo = entrada, negativo = salida |
| `notes` | `text` | Descripción del movimiento |
| `created_at` | `timestamptz` | — |

**Valores de `movement_type`:**
| Valor | Descripción | Quién lo genera |
|---|---|---|
| `'entrada'` | Entrada de stock manual | Admin (InventoryMovements.tsx) |
| `'salida'` | Salida de stock manual | Admin |
| `'ajuste'` | Ajuste de inventario | Admin |
| `'sale'` | Descuento automático por venta | `useCreateSale` |
| `'sale_return'` | Reposición por cancelación/eliminación | `useCancelSale` / `useDeleteSale` |

#### Políticas RLS

| Operación | Rol requerido | Condición |
|---|---|---|
| SELECT | `authenticated` | Todos |
| INSERT | `authenticated` | `user_id = auth.uid()` |
| ALL (update/delete) | `authenticated` | Solo admins |

#### Registrar un movimiento manual

```ts
const { error } = await supabase
  .from('inventory_movements')
  .insert({
    product_id: 'uuid-producto',
    user_id: user.id,
    movement_type: 'entrada',
    quantity: 20,
    notes: 'Reposición de proveedor',
  });
```

---

## Funciones de base de datos

### `has_role(user_id, role)`

```sql
SELECT public.has_role('uuid-usuario', 'admin');
-- Retorna: boolean
```

Verifica si un usuario tiene un rol específico. Usada internamente en las políticas RLS.

### `is_admin()`

```sql
SELECT public.is_admin();
-- Retorna: boolean (evalúa auth.uid())
```

Atajo que comprueba si el usuario actual del JWT es admin. Usada en todas las políticas de escritura.

### `handle_new_user()` (trigger)

Se dispara automáticamente al insertar en `auth.users`. Crea el registro en `profiles` y asigna el rol `'vendedor'` en `user_roles`.

---

## Errores comunes de Supabase PostgREST

| Código | Mensaje | Causa |
|---|---|---|
| `42501` | `new row violates row-level security` | RLS bloqueó el insert/update. Verificar rol del usuario. |
| `23505` | `duplicate key value violates unique constraint` | Valor duplicado en campo UNIQUE (ej: `sku`, `categories.name`). |
| `23503` | `insert or update on table ... violates foreign key` | FK inválida: el UUID referenciado no existe. |
| `PGRST116` | `JSON object requested, multiple (or no) rows returned` | Se usó `.single()` pero la query retornó 0 o múltiples filas. |
| `400` | Auth error | JWT expirado o inválido. El cliente refresca automáticamente con `autoRefreshToken: true`. |

---

## Configuración del cliente Supabase

```ts
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,    // Sesión persistida en localStorage
      persistSession: true,
      autoRefreshToken: true,   // Renueva el JWT automáticamente
    },
  }
);
```

El tipo genérico `Database` (generado en `types.ts`) provee autocompletado total para tablas, columnas y relaciones.
