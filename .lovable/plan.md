

## Dashboard de Gestión de Inventario, Clientes y Reportes

### Visión General
Crearemos un dashboard moderno y minimalista para tu tienda minorista, con autenticación para tu equipo pequeño y roles básicos (admin/vendedor). El sistema te permitirá gestionar inventario, clientes y ver estadísticas clave de tu negocio.

---

### Fase 1: Autenticación y Configuración Base

**Sistema de usuarios con roles**
- Página de login/registro con email y contraseña
- Dos roles: **Administrador** (acceso completo) y **Vendedor** (acceso limitado)
- Los admins pueden invitar nuevos usuarios al sistema

**Layout del Dashboard**
- Sidebar colapsable con navegación clara
- Header con información del usuario y botón de cerrar sesión
- Diseño responsivo para uso en computadora y tablet

---

### Fase 2: Gestión de Inventario (Productos)

**Catálogo de productos**
- Lista de productos con búsqueda y filtros
- Vista en tabla con: nombre, SKU, categoría, precio, stock actual
- Indicadores visuales de stock bajo (alerta cuando queda poco)

**Gestión de productos**
- Crear, editar y eliminar productos
- Campos: nombre, descripción, SKU, categoría, precio de compra, precio de venta, stock mínimo
- Historial de movimientos de inventario (entradas y salidas)

**Importación de datos**
- Funcionalidad para importar productos desde archivo CSV/Excel
- Plantilla descargable para facilitar el formato correcto

---

### Fase 3: Gestión de Clientes

**Directorio de clientes**
- Lista de clientes con búsqueda por nombre, email o teléfono
- Vista de tabla con datos de contacto principales

**Perfil de cliente**
- Información de contacto (nombre, email, teléfono, dirección)
- Notas adicionales sobre el cliente

**Importación de clientes**
- Importar clientes existentes desde CSV/Excel

---

### Fase 4: Reportes y Estadísticas

**Panel principal (Dashboard)**
- Resumen visual con tarjetas: total de productos, productos con stock bajo, total de clientes
- Gráfico de valor del inventario por categoría

**Reportes de inventario**
- Lista de productos con stock bajo o agotado
- Valor total del inventario
- Productos más y menos abundantes

---

### Diseño Visual

- **Estilo**: Moderno y minimalista con mucho espacio en blanco
- **Colores**: Paleta neutra con acentos sutiles para indicadores de estado
- **Tipografía**: Clara y legible
- **Iconografía**: Iconos simples y consistentes

---

### Tecnología (Backend)
Se utilizará **Lovable Cloud con Supabase** para:
- Base de datos para productos, clientes, usuarios y movimientos
- Autenticación segura
- Políticas de seguridad por rol (RLS)
- Almacenamiento para imágenes de productos (futuro)

---

### Próximos pasos (después del MVP)
Una vez tengamos el MVP funcionando, podremos agregar:
- Registro de ventas y facturación
- Historial de compras por cliente
- Alertas automáticas de stock bajo
- Exportación de reportes a PDF/Excel
- Más métricas y gráficos avanzados

