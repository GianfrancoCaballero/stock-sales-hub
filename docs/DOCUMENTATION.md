# Documentación Completa del Proyecto — Sistema de Gestión de Ventas e Inventario

> **Última actualización:** 14 de marzo de 2026

---

## Índice

1. [Resumen General](#1-resumen-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Proyecto](#3-arquitectura-del-proyecto)
4. [Base de Datos](#4-base-de-datos)
5. [Autenticación y Roles](#5-autenticación-y-roles)
6. [Módulos y Funcionalidades](#6-módulos-y-funcionalidades)
7. [Backend Functions (Edge Functions)](#7-backend-functions-edge-functions)
8. [Tienda Pública (minifig-store)](#8-tienda-pública-minifig-store)
9. [Políticas de Seguridad (RLS)](#9-políticas-de-seguridad-rls)
10. [Flujos de Negocio](#10-flujos-de-negocio)

---

## 1. Resumen General

Dashboard interno de gestión para un negocio de venta de minifiguras/productos. Permite:

- Gestión completa de **productos**, **categorías**, **clientes** y **usuarios**
- Registro de **ventas** con POS integrado (carrito)
- Control de **inventario** con movimientos de stock automáticos
- **Reportes** con exportación a PDF y Excel
- **Control de acceso por roles** (admin / vendedor)
- **Tienda pública** separada (`minifig-store/`) para clientes finales

---

## 2. Stack Tecnológico

### Dashboard (app principal)

| Capa | Tecnología | Uso |
|---|---|---|
| **UI Framework** | React 18.3 + TypeScript 5.8 | Interfaz de usuario |
| **Build Tool** | Vite 5.4 | Bundling y dev server |
| **Estilos** | Tailwind CSS 3.4 | Utility-first CSS |
| **Componentes UI** | shadcn/ui (Radix UI) | Primitivos accesibles (Dialog, Select, Table, etc.) |
| **Data Fetching** | TanStack Query 5.x | Cache, invalidación, estados de carga |
| **Backend / DB** | Lovable Cloud (Supabase PostgreSQL) | Auth, DB, Edge Functions, Storage |
| **Formularios** | React Hook Form + Zod | Validación y gestión de forms |
| **Gráficos** | Recharts | Gráfico de barras en Dashboard |
| **Reportes** | jsPDF + jspdf-autotable + SheetJS (xlsx) | Exportación PDF y Excel |
| **Tests** | Vitest + Testing Library | Tests unitarios |

### Tienda Pública (minifig-store)

| Capa | Tecnología |
|---|---|
| React 19 + TypeScript | UI |
| Vite 7 | Build |
| Tailwind CSS 4.2 | Estilos |
| Supabase JS SDK 2.x | Conexión a la misma DB |
| Lucide React | Iconos |
| date-fns | Formato de fechas |

---

## 3. Arquitectura del Proyecto

```
stock-sales-hub/
├── src/                         # App principal (Dashboard admin)
│   ├── components/
│   │   ├── layout/
│   │   │   └── DashboardLayout.tsx    # Sidebar + Header responsive
│   │   ├── products/
│   │   │   └── ImportProductsDialog.tsx # Importación masiva de productos
│   │   ├── sales/
│   │   │   ├── NewSaleTab.tsx          # POS: búsqueda + carrito
│   │   │   ├── SalesHistoryTab.tsx     # Historial con filtros
│   │   │   ├── SaleDetailDialog.tsx    # Detalle, edición y eliminación
│   │   │   └── SaleSuccessDialog.tsx   # Confirmación de venta exitosa
│   │   ├── ui/                         # ~50 componentes shadcn/ui
│   │   ├── NavLink.tsx
│   │   └── ProtectedRoute.tsx          # Guard de rutas autenticadas
│   ├── hooks/
│   │   ├── useAuth.tsx                 # Contexto de autenticación + roles
│   │   ├── useSales.ts                 # CRUD completo de ventas (TanStack Query)
│   │   ├── use-toast.ts               # Notificaciones toast
│   │   └── use-mobile.tsx             # Detección de viewport móvil
│   ├── integrations/supabase/
│   │   ├── client.ts                  # Instancia del cliente (auto-generado)
│   │   └── types.ts                   # Tipos TypeScript de la DB (auto-generado)
│   ├── pages/
│   │   ├── Auth.tsx                   # Login + Registro + Google OAuth
│   │   ├── Dashboard.tsx              # KPIs: productos, stock bajo, clientes, valor
│   │   ├── Products.tsx               # CRUD productos + export PDF/Excel
│   │   ├── Customers.tsx              # CRUD clientes
│   │   ├── Sales.tsx                  # Tabs: Nueva Venta | Historial
│   │   ├── InventoryMovements.tsx     # Historial de movimientos de stock
│   │   ├── Reports.tsx                # Reportes de ventas con filtros + export
│   │   ├── Categories.tsx             # CRUD categorías (solo admin)
│   │   ├── Users.tsx                  # Gestión de usuarios y roles (solo admin)
│   │   └── NotFound.tsx               # Página 404
│   ├── App.tsx                        # Router + providers globales
│   └── main.tsx                       # Punto de entrada React
│
├── minifig-store/                     # Tienda pública para clientes
│   └── src/
│       ├── pages/                     # Home, Catalog, ProductDetail, Auth, Profile
│       ├── components/                # Navbar, Footer, ProductCard, CartDrawer
│       ├── hooks/                     # useAuth, useCart
│       └── lib/supabase.ts            # Cliente Supabase independiente
│
├── supabase/
│   ├── config.toml                    # Configuración del proyecto
│   ├── migrations/                    # Migraciones SQL (cronológicas)
│   └── functions/
│       └── delete-user/index.ts       # Edge Function: eliminar usuario
│
└── docs/
    ├── API.md                         # Documentación de API
    └── META_INTEGRATION.md            # Integración Meta
```

---

## 4. Base de Datos

### Diagrama de Relaciones

```
auth.users (Supabase Auth - gestionado automáticamente)
    ├── profiles          (1:1) — user_id, full_name, email
    └── user_roles        (1:1) — user_id, role: 'admin' | 'vendedor'

categories
    └── products          (1:N) — category_id FK
            ├── sale_items            (1:N) — product_id FK
            └── inventory_movements   (1:N) — product_id FK

customers
    ├── sales             (1:N) — customer_id FK
    └── (user_id - para tienda pública, clientes con cuenta)

sales
    └── sale_items        (1:N) — sale_id FK (CASCADE DELETE)
```

### Tablas Detalladas

#### `categories`
| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `name` | text | NO | — | Nombre único de la categoría |
| `description` | text | SÍ | `null` | Descripción opcional |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última modificación |

#### `products`
| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `name` | text | NO | — | Nombre del producto |
| `description` | text | SÍ | `null` | Descripción |
| `sku` | text | SÍ | `null` | Código de producto |
| `category_id` | uuid | SÍ | `null` | FK → `categories.id` |
| `purchase_price` | numeric | NO | `0` | Precio de compra |
| `sale_price` | numeric | NO | `0` | Precio de venta |
| `stock_quantity` | integer | NO | `0` | Stock actual |
| `min_stock` | integer | NO | `0` | Stock mínimo (alerta) |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última modificación |

> **Nota:** La tabla `products` no tiene columnas `is_active` ni `image_url` en la DB actual. El tipo local en `Products.tsx` las define para uso interno.

#### `customers`
| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `name` | text | NO | — | Nombre del cliente |
| `email` | text | SÍ | `null` | Email de contacto |
| `phone` | text | SÍ | `null` | Teléfono |
| `address` | text | SÍ | `null` | Dirección |
| `notes` | text | SÍ | `null` | Notas adicionales |
| `user_id` | uuid | SÍ | `null` | Enlace a auth.users (tienda pública) |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última modificación |

#### `sales`
| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `customer_id` | uuid | SÍ | `null` | FK → `customers.id` (null = cliente general) |
| `user_id` | uuid | NO | — | UUID del vendedor (auth.users) |
| `total` | numeric | NO | `0` | Total de la venta |
| `payment_method` | text | NO | `'efectivo'` | `'efectivo'` \| `'tarjeta'` \| `'transferencia'` |
| `status` | text | NO | `'completada'` | `'completada'` \| `'cancelada'` |
| `notes` | text | SÍ | `null` | Notas opcionales |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |

#### `sale_items`
| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `sale_id` | uuid | NO | — | FK → `sales.id` (CASCADE DELETE) |
| `product_id` | uuid | NO | — | FK → `products.id` |
| `quantity` | integer | NO | — | Cantidad vendida |
| `unit_price` | numeric | NO | — | Precio unitario al momento de la venta |
| `subtotal` | numeric | NO | — | `quantity × unit_price` |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |

#### `inventory_movements`
| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `product_id` | uuid | NO | — | FK → `products.id` |
| `user_id` | uuid | SÍ | `null` | UUID del usuario que realizó el movimiento |
| `movement_type` | text | NO | — | Tipo (ver tabla abajo) |
| `quantity` | integer | NO | — | Cantidad (+/−) |
| `notes` | text | SÍ | `null` | Descripción del movimiento |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |

**Tipos de movimiento:**
| Valor | Descripción | Cantidad |
|---|---|---|
| `entrada` | Ingreso de stock | Positiva (+) |
| `salida` | Salida manual de stock | Negativa (−) |
| `ajuste` | Ajuste manual | Positiva o negativa |
| `sale` | Venta completada | Negativa (−) |
| `sale_return` | Devolución por cancelación/eliminación | Positiva (+) |

#### `profiles`
| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | UUID de auth.users |
| `full_name` | text | NO | — | Nombre completo |
| `email` | text | SÍ | `null` | Email (copia para consulta rápida) |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |
| `updated_at` | timestamptz | NO | `now()` | Última modificación |

#### `user_roles`
| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | UUID de auth.users (UNIQUE) |
| `role` | `app_role` enum | NO | `'vendedor'` | `'admin'` \| `'vendedor'` |
| `created_at` | timestamptz | NO | `now()` | Fecha de creación |

### Vistas

#### `products_public`
Vista de solo lectura que expone productos sin `purchase_price`. Usada por la tienda pública para que los clientes no vean el precio de compra.

### Funciones de Base de Datos

| Función | Parámetros | Retorno | Descripción |
|---|---|---|---|
| `has_role(_user_id uuid, _role app_role)` | UUID + rol | boolean | Verifica si un usuario tiene un rol específico. `SECURITY DEFINER` para evitar recursión en RLS. |
| `is_admin()` | ninguno | boolean | Atajo: verifica si el usuario autenticado (`auth.uid()`) es admin. Usa `has_role` internamente. |

### Enums

| Nombre | Valores |
|---|---|
| `app_role` | `'admin'`, `'vendedor'` |

---

## 5. Autenticación y Roles

### Flujo de Autenticación

1. **Registro:** El usuario se registra con email + contraseña + nombre completo. Supabase Auth envía email de confirmación.
2. **Trigger automático (`handle_new_user`):** Al confirmarse el usuario, se crea automáticamente:
   - Un registro en `profiles` con `full_name` del metadata
   - Un registro en `user_roles` con rol `'vendedor'` por defecto
3. **Login:** Email + contraseña o Google OAuth.
4. **Google OAuth:** Si el usuario se autentica con Google y no tiene registro en `customers`, se crea automáticamente (solo en tienda pública).

### Roles

| Rol | Descripción | Asignación |
|---|---|---|
| `vendedor` | Rol por defecto. Puede ver productos, crear ventas, gestionar clientes. | Automático al registrarse |
| `admin` | Acceso completo. CRUD de productos, categorías, usuarios. Puede editar/eliminar ventas. | Manual por otro admin |

### Contexto de Auth (`useAuth`)

```typescript
interface AuthContextType {
  user: User | null;          // Usuario de Supabase Auth
  session: Session | null;    // Sesión activa
  loading: boolean;           // Carga inicial
  role: 'admin' | 'vendedor' | null;
  isAdmin: boolean;           // Atajo: role === 'admin'
  signIn(email, password): Promise<{ error }>;
  signUp(email, password, fullName): Promise<{ error }>;
  signOut(): Promise<void>;
}
```

### Protección de Rutas (`ProtectedRoute`)

```tsx
// Ruta protegida estándar — requiere autenticación
<ProtectedRoute>
  <Component />
</ProtectedRoute>

// Ruta solo admin — redirige a / si no es admin
<ProtectedRoute requireAdmin>
  <Component />
</ProtectedRoute>
```

---

## 6. Módulos y Funcionalidades

### 6.1 Dashboard (`/`)

**Archivo:** `src/pages/Dashboard.tsx`

**KPIs mostrados:**
- Total de productos en inventario
- Productos con stock bajo (≤ `min_stock`)
- Total de clientes registrados
- Valor total del inventario (a precio de venta)

**Gráfico:** Barras con valor del inventario por categoría (Recharts).

**Permisos:** Todos los roles.

---

### 6.2 Productos (`/productos`)

**Archivo:** `src/pages/Products.tsx` (648 líneas)

**Funcionalidades:**

| Acción | Vendedor | Admin |
|---|---|---|
| Ver lista de productos | ✅ | ✅ |
| Buscar por nombre/SKU | ✅ | ✅ |
| Exportar stock a Excel | ✅ | ✅ |
| Exportar stock a PDF | ✅ | ✅ |
| Crear producto | ❌ | ✅ |
| Editar producto | ❌ | ✅ |
| Eliminar producto | ❌ | ✅ |
| Importación masiva (Excel) | ❌ | ✅ |
| Toggle visibilidad tienda | ❌ | ✅ |

**Campos del formulario:**
- Nombre* , SKU, Descripción, Categoría (select)
- Precio de Compra, Precio de Venta
- Stock Actual, Stock Mínimo
- URL de Imagen, Estado activo/inactivo (switch)

**Exportación Excel:** Genera archivo con 2 hojas: Resumen + Stock Detalle.
**Exportación PDF:** Landscape con header, resumen y tabla coloreada.

---

### 6.3 Clientes (`/clientes`)

**Archivo:** `src/pages/Customers.tsx` (377 líneas)

**Funcionalidades:**

| Acción | Vendedor | Admin |
|---|---|---|
| Ver lista | ✅ | ✅ |
| Buscar por nombre/email/teléfono | ✅ | ✅ |
| Crear cliente | ❌ | ✅ |
| Editar cliente | ❌ | ✅ |
| Eliminar cliente | ❌ | ✅ |

**Campos:** Nombre*, Email, Teléfono, Dirección, Notas.

---

### 6.4 Ventas (`/ventas`)

**Archivo:** `src/pages/Sales.tsx` → Tabs: `NewSaleTab` | `SalesHistoryTab`

#### Tab: Nueva Venta (POS)

**Archivo:** `src/components/sales/NewSaleTab.tsx` (467 líneas)

**Flujo de venta:**
1. Buscar productos por nombre/SKU
2. Agregar al carrito (valida stock disponible)
3. Modificar cantidades (+/−) con validación de stock
4. Seleccionar cliente (buscador combobox) o "Cliente General"
5. Elegir método de pago: Efectivo / Tarjeta / Transferencia
6. Agregar notas opcionales
7. Confirmar venta → Descuento automático de stock

**Lógica de negocio (`useCreateSale`):**
1. Verifica autenticación del usuario
2. Valida carrito no vacío y total > 0
3. Verifica stock suficiente por cada producto (lectura en tiempo real)
4. Inserta registro en `sales`
5. Inserta líneas en `sale_items`
6. Descuenta `stock_quantity` en `products` por cada ítem
7. Registra `inventory_movements` tipo `'sale'` por cada ítem
8. Invalida queries de TanStack Query

#### Tab: Historial

**Archivo:** `src/components/sales/SalesHistoryTab.tsx` (262 líneas)

**Filtros disponibles:**
- Fecha desde / hasta (calendar picker)
- Método de pago
- Estado (completada / cancelada)
- Búsqueda por nombre de cliente

**Acciones por fila:** Ver detalle (ojo)

#### Detalle de Venta

**Archivo:** `src/components/sales/SaleDetailDialog.tsx` (363 líneas)

**Información mostrada:** Cliente, vendedor, método de pago, estado, notas, tabla de productos vendidos, total.

**Acciones (solo admin):**
- **Editar:** Cambiar cliente, método de pago, notas
- **Cancelar venta:** Cambia estado a `'cancelada'`, restaura stock, registra movimientos `'sale_return'`
- **Eliminar permanentemente:** Elimina la venta + cascade en `sale_items`, restaura stock si estaba completada

---

### 6.5 Movimientos de Inventario (`/inventario`)

**Archivo:** `src/pages/InventoryMovements.tsx` (414 líneas)

**Funcionalidades:**
- Historial de todos los movimientos (últimos 200)
- Filtros por tipo y búsqueda por producto/SKU/notas
- Registro manual de movimientos (entrada/salida/ajuste) — solo admin

**Tipos de movimiento con colores:**
| Tipo | Color | Icono |
|---|---|---|
| Entrada | Verde | ArrowDownCircle |
| Salida | Rojo | ArrowUpCircle |
| Ajuste | Azul | RefreshCw |
| Venta | Naranja | ShoppingCart |
| Dev. Venta | Púrpura | Undo2 |

---

### 6.6 Reportes (`/reportes`)

**Archivo:** `src/pages/Reports.tsx` (441 líneas)

**Filtros:**
- Período (desde — hasta)
- Método de pago
- Estado
- Búsqueda libre en resultados

**KPIs calculados:**
- Total ventas en período
- Ventas completadas (% del total)
- Ingresos totales (solo completadas)
- Ticket promedio

**Exportación:**
- **Excel:** 2 hojas (Resumen + Ventas detalle)
- **PDF:** Landscape con header, resumen y tabla

---

### 6.7 Categorías (`/categorias`) — Solo Admin

**Archivo:** `src/pages/Categories.tsx` (322 líneas)

CRUD completo: Crear, leer, editar, eliminar categorías.
**Campos:** Nombre*, Descripción.
Los productos de una categoría eliminada quedan sin categoría asignada.

---

### 6.8 Usuarios (`/usuarios`) — Solo Admin

**Archivo:** `src/pages/Users.tsx` (324 líneas)

**Funcionalidades:**
- Lista de todos los usuarios con su rol
- **Cambiar rol:** Toggle entre Admin ↔ Vendedor (no puedes cambiar tu propio rol)
- **Editar perfil:** Modificar nombre completo y email
- **Eliminar usuario:** Vía Edge Function `delete-user` (no puedes eliminarte a ti mismo)

---

## 7. Backend Functions (Edge Functions)

### `delete-user`

**Archivo:** `supabase/functions/delete-user/index.ts`

**Endpoint:** `POST /functions/v1/delete-user`

**Autenticación:** Bearer token (sesión del usuario admin)

**Body:**
```json
{ "user_id": "uuid-del-usuario-a-eliminar" }
```

**Flujo:**
1. Verifica que el solicitante esté autenticado
2. Verifica que tenga rol `admin` consultando `user_roles`
3. Valida que no intente eliminarse a sí mismo
4. Usa `SUPABASE_SERVICE_ROLE_KEY` para:
   - Eliminar registro en `user_roles`
   - Eliminar registro en `profiles`
   - Eliminar cuenta en `auth.users`

**Respuestas:**
| Status | Respuesta |
|---|---|
| 200 | `{ "success": true }` |
| 401 | `{ "error": "No autorizado" }` |
| 403 | `{ "error": "Solo administradores..." }` |
| 400 | `{ "error": "user_id es requerido" }` o `"No puedes eliminar tu propia cuenta"` |
| 500 | `{ "error": "mensaje del error" }` |

---

## 8. Tienda Pública (minifig-store)

### Rutas

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `Home` | Landing page |
| `/catalogo` | `Catalog` | Catálogo de productos |
| `/producto/:id` | `ProductDetail` | Detalle de un producto |
| `/auth` | `Auth` | Login / Registro de clientes |
| `/perfil` | `Profile` | Perfil del cliente |

### Componentes

| Componente | Descripción |
|---|---|
| `Navbar` | Navegación superior con carrito |
| `Footer` | Pie de página |
| `ProductCard` | Tarjeta de producto en catálogo |
| `CartDrawer` | Drawer lateral con el carrito |

### Hooks

- **`useAuth`:** Autenticación de clientes. Si el usuario se autentica con Google, se crea automáticamente un registro en `customers`.
- **`useCart`:** Estado del carrito de compras (contexto).

### Conexión a la DB

Usa la misma base de datos que el dashboard, pero accede a productos a través de la vista `products_public` que oculta el `purchase_price`.

---

## 9. Políticas de Seguridad (RLS)

Todas las tablas tienen **Row Level Security (RLS)** habilitado. Resumen de políticas:

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `categories` | Todos autenticados | Solo admin (`is_admin()`) | Solo admin | Solo admin |
| `products` | Todos autenticados + vista pública | Solo admin | Solo admin | Solo admin |
| `customers` | Todos autenticados | Todos autenticados | Todos autenticados | Solo admin |
| `sales` | Todos autenticados | Todos autenticados | Solo admin | Solo admin |
| `sale_items` | Todos autenticados | Todos autenticados | Solo admin | Solo admin (+ cascade) |
| `inventory_movements` | Todos autenticados | Todos autenticados | — | — |
| `profiles` | Todos autenticados | Sistema (trigger) | Propio usuario + admin | — |
| `user_roles` | Todos autenticados | Sistema (trigger) | Solo admin | Solo admin |

---

## 10. Flujos de Negocio

### 10.1 Flujo de Venta Completa

```
[Vendedor busca productos] 
    → [Agrega al carrito]
    → [Selecciona cliente y método de pago]
    → [Confirma venta]
        → Verificación de stock en tiempo real
        → INSERT en `sales`
        → INSERT en `sale_items` (N líneas)
        → UPDATE `products.stock_quantity` (−cantidad por ítem)
        → INSERT en `inventory_movements` tipo 'sale' (por ítem)
        → Invalidación de cache (TanStack Query)
    → [Diálogo de éxito]
```

### 10.2 Flujo de Cancelación de Venta

```
[Admin abre detalle de venta completada]
    → [Click "Cancelar Venta"]
    → [Confirmación]
        → UPDATE `sales.status` = 'cancelada'
        → UPDATE `products.stock_quantity` (+cantidad por ítem)
        → INSERT en `inventory_movements` tipo 'sale_return' (por ítem)
```

### 10.3 Flujo de Eliminación de Venta

```
[Admin abre detalle de venta]
    → [Click eliminar]
    → [Confirmación]
        → Si status = 'completada':
            → UPDATE `products.stock_quantity` (+cantidad por ítem)
            → INSERT en `inventory_movements` tipo 'sale_return'
        → DELETE `sales` (CASCADE elimina `sale_items`)
```

### 10.4 Flujo de Registro de Usuario

```
[Usuario llena formulario de registro]
    → Supabase Auth crea cuenta
    → Email de confirmación
    → [Usuario confirma email]
    → Trigger `handle_new_user`:
        → INSERT en `profiles` (full_name del metadata)
        → INSERT en `user_roles` (role = 'vendedor')
    → [Login exitoso → redirect a Dashboard]
```

### 10.5 Flujo de Eliminación de Usuario

```
[Admin click eliminar en /usuarios]
    → [Confirmación]
    → POST Edge Function `delete-user`
        → Verificar auth + rol admin
        → DELETE `user_roles` del usuario
        → DELETE `profiles` del usuario  
        → DELETE `auth.users` (via admin API)
    → Refresh lista de usuarios
```

---

## Hooks Principales (API interna)

### `useSales.ts` — Hooks de TanStack Query

| Hook | Tipo | Query Key | Descripción |
|---|---|---|---|
| `useProducts()` | Query | `['products-for-sale']` | Productos con stock > 0 |
| `useCustomers()` | Query | `['customers-for-sale']` | Lista de clientes |
| `useSalesHistory(filters)` | Query | `['sales-history', filters]` | Historial filtrado + nombre vendedor |
| `useSaleDetails(saleId)` | Query | `['sale-details', saleId]` | Líneas de una venta |
| `useCreateSale()` | Mutation | — | Crear venta + descontar stock |
| `useCancelSale()` | Mutation | — | Cancelar venta + restaurar stock |
| `useUpdateSale()` | Mutation | — | Editar metadata de venta |
| `useDeleteSale()` | Mutation | — | Eliminar venta + restaurar stock |

### Tipos exportados desde `useSales.ts`

```typescript
CartItem        // Ítem del carrito (producto + cantidad + subtotal)
SaleFormData    // Datos para crear venta (items + cliente + pago + notas)
Sale            // Venta con JOINs (customer, seller)
SaleItem        // Línea de venta con JOIN producto
SalesFilters    // Filtros del historial
SaleUpdateData  // Campos editables (customer_id, payment_method, notes)
```

---

## Variables de Entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Lovable Cloud | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon key) | ✅ |
| `VITE_SUPABASE_PROJECT_ID` | ID del proyecto | ⬜ (solo referencia) |

**Secrets del backend (Edge Functions):**
| Secret | Uso |
|---|---|
| `SUPABASE_URL` | URL interna del proyecto |
| `SUPABASE_ANON_KEY` | Clave anon para verificar auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role para operaciones admin |
| `LOVABLE_API_KEY` | Clave para funcionalidades AI de Lovable |

---

## Scripts de Desarrollo

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (`:8080`) |
| `npm run build` | Build de producción |
| `npm run lint` | Análisis estático con ESLint |
| `npm run test` | Tests con Vitest |
| `npm run preview` | Preview del build de producción |
