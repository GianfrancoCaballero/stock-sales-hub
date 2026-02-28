# Sistema de Gestión de Ventas e Inventario

Dashboard interno para gestionar el inventario y el flujo de ventas de un negocio. Permite registrar productos, clientes, movimientos de inventario y ventas, con reportes descargables en PDF/Excel y control de acceso por roles (admin / vendedor).

## Stack

| Capa | Tecnología | Versión |
|---|---|---|
| UI | React | 18.3 |
| Lenguaje | TypeScript | 5.8 |
| Build | Vite | 5.4 |
| Estilos | Tailwind CSS | 3.4 |
| Componentes | shadcn/ui (Radix UI) | — |
| Data fetching | TanStack Query | 5.x |
| Backend / DB | Supabase (PostgreSQL) | SDK 2.x |
| Forms | React Hook Form + Zod | — |
| Tests | Vitest + Testing Library | 3.x / 16.x |
| Reportes | jsPDF + SheetJS | — |

---

## Requisitos previos

- **Node.js** ≥ 18.x  (`node -v` para verificar)
- **npm** ≥ 9.x  o  **bun** ≥ 1.x
- Cuenta y proyecto en [Supabase](https://supabase.com)

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd stock-sales-hub

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de variables de entorno
cp .env.example .env
# (Editar .env con tus credenciales — ver sección Variables de entorno)

# 4. Aplicar migraciones en Supabase
#    Opción A: Supabase CLI
npx supabase db push

#    Opción B: Supabase Dashboard → SQL Editor
#    Ejecutar los archivos en supabase/migrations/ en orden cronológico.

# 5. Levantar el servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173`.

---

## Ejemplo de uso rápido

1. Abre `http://localhost:5173/auth` y crea una cuenta con tu email.
2. El primer usuario creado tendrá rol **vendedor** por defecto.
3. Para promover un usuario a **admin**, ejecuta en el SQL Editor de Supabase:

```sql
UPDATE public.user_roles SET role = 'admin'
WHERE user_id = '<UUID_DEL_USUARIO>';
```

4. Inicia sesión → serás redirigido al **Dashboard** con métricas del día.
5. Navega a **Productos** para agregar tu primer artículo.
6. Ve a **Ventas** para registrar una venta usando el carrito integrado.

---

## Estructura del proyecto

```
stock-sales-hub/
├── public/                  # Assets estáticos (favicon, etc.)
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── layout/          # DashboardLayout (sidebar + header)
│   │   ├── products/        # Componentes específicos de productos
│   │   ├── sales/           # Carrito, formulario de venta, historial
│   │   └── ui/              # Primitivos shadcn/ui (button, dialog, etc.)
│   ├── hooks/               # Hooks personalizados
│   │   ├── useAuth.tsx      # Autenticación + contexto de rol
│   │   ├── useSales.ts      # CRUD de ventas y lógica del carrito
│   │   ├── use-toast.ts     # Wrapper de notificaciones toast
│   │   └── use-mobile.tsx   # Detección de viewport móvil
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts    # Instancia del cliente Supabase
│   │       └── types.ts     # Tipos TypeScript generados por Supabase
│   ├── pages/               # Una página por ruta
│   │   ├── Auth.tsx         # Login / Registro
│   │   ├── Dashboard.tsx    # KPIs del día (ventas, productos, clientes)
│   │   ├── Products.tsx     # CRUD de productos (solo admin)
│   │   ├── Customers.tsx    # CRUD de clientes
│   │   ├── Sales.tsx        # Registro de ventas (carrito)
│   │   ├── InventoryMovements.tsx  # Entradas/salidas/ajustes de stock
│   │   ├── Reports.tsx      # Reportes con exportación PDF/Excel
│   │   ├── Categories.tsx   # CRUD de categorías (solo admin)
│   │   ├── Users.tsx        # Gestión de usuarios y roles (solo admin)
│   │   └── NotFound.tsx     # Página 404
│   ├── lib/
│   │   └── utils.ts         # Utilidades (cn helper para clases Tailwind)
│   ├── test/
│   │   ├── setup.ts         # Configuración global de Vitest
│   │   └── example.test.ts  # Test de ejemplo
│   ├── App.tsx              # Router principal + providers globales
│   └── main.tsx             # Punto de entrada de React
├── supabase/
│   ├── config.toml          # Configuración del proyecto Supabase (ID)
│   ├── migrations/          # Migraciones SQL ordenadas cronológicamente
│   └── functions/           # Edge Functions (si aplica)
├── .env                     # Variables de entorno locales (NO versionar)
├── .env.example             # Plantilla de variables de entorno
├── tailwind.config.ts       # Configuración de Tailwind
├── vite.config.ts           # Configuración de Vite
└── vitest.config.ts         # Configuración de tests
```

---

## Variables de entorno

Crear el archivo `.env` en la raíz del proyecto con las siguientes variables:

| Variable | Descripción | Ejemplo | Obligatoria |
|---|---|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | `https://xxxx.supabase.co` | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave anon/publishable del proyecto | `sb_publishable_...` | ✅ |
| `VITE_SUPABASE_PROJECT_ID` | ID del proyecto Supabase | `djnoaxkogobohmppernt` | ⬜ (solo CLI) |

> **Nota:** Estas variables deben empezar con `VITE_` para ser expuestas por Vite al cliente. Nunca uses la `service_role` key en el frontend.

Para obtener los valores: Supabase Dashboard → Settings → API.

---

## Cómo ejecutar los tests

```bash
# Ejecutar todos los tests una sola vez
npm run test

# Modo watch (re-ejecuta al guardar)
npm run test:watch
```

Los tests usan **Vitest** + **Testing Library** con entorno `jsdom`.  
Los archivos de test deben estar en `src/` y tener extensión `.test.ts` o `.spec.tsx`.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (`localhost:5173`) |
| `npm run build` | Build de producción en `dist/` |
| `npm run lint` | Análisis estático con ESLint |
| `npm run test` | Tests con Vitest (una pasada) |
| `npm run test:watch` | Tests en modo watch |
| `npm run preview` | Preview del build de producción |

---

## Roles y permisos

| Ruta | `vendedor` | `admin` |
|---|---|---|
| `/` — Dashboard | ✅ | ✅ |
| `/productos` — Productos | 👁️ lectura | ✅ CRUD |
| `/clientes` — Clientes | ✅ | ✅ |
| `/ventas` — Ventas | ✅ crear | ✅ crear + cancelar + eliminar |
| `/inventario` — Movimientos | ✅ | ✅ |
| `/reportes` — Reportes | ✅ | ✅ |
| `/categorias` — Categorías | ❌ | ✅ |
| `/usuarios` — Usuarios | ❌ | ✅ |

---

## Cómo contribuir

1. Crea un branch: `git checkout -b feat/nombre-de-la-feature`
2. Haz tus cambios y asegúrate de que los tests pasen: `npm run test`
3. Asegúrate de que no hay errores de lint: `npm run lint`
4. Abre un Pull Request con descripción del cambio y capturas si modificas UI.

---

## Esquema de base de datos

```
auth.users (Supabase)
    └── profiles          (1:1) — nombre completo, email
    └── user_roles        (1:1) — rol: 'admin' | 'vendedor'

categories
    └── products (N:1)
            └── sale_items (N:1)
            └── inventory_movements (N:1)

customers
    └── sales (1:N)
            └── sale_items (1:N)
```

Todas las tablas tienen **Row Level Security (RLS)** habilitado. Las operaciones de escritura sensibles están restringidas al rol `admin` mediante la función `is_admin()`.
