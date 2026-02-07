

## Plan: Importación de Productos desde Excel/CSV

### Resumen del Archivo Analizado

Tu archivo **Control_Stock_MiniLego.xlsx** contiene una hoja con 44 productos de figuras de anime (Jujutsu Kaisen, Chainsaw Man) con las siguientes columnas:

| Columna del Excel | Campo en Base de Datos |
|-------------------|----------------------|
| Codigo | sku |
| Nombre del personaje | name |
| Anime de origen | category (se creará si no existe) |
| Cantidad en stock | stock_quantity |
| Precio de venta | sale_price |
| Proveedor | description (como nota adicional) |
| Estado | Se calculará automáticamente por stock |

---

### Funcionalidad a Implementar

#### 1. Botón de Importar en la Página de Productos
- Agregar un botón "Importar Excel/CSV" junto al botón "Nuevo Producto"
- Solo visible para administradores
- Icono de Upload para identificarlo fácilmente

#### 2. Diálogo de Importación
Un modal que permita:
- Subir archivos .xlsx, .xls o .csv
- Vista previa de los datos detectados en una tabla
- Resumen: cantidad de productos a importar, nuevas categorías a crear
- Botones para confirmar o cancelar la importación

#### 3. Procesamiento del Archivo
- Instalar librería **xlsx** para leer archivos Excel
- Detectar automáticamente las columnas del archivo
- Mapear las columnas del Excel a los campos de la base de datos
- Crear categorías automáticamente si no existen (ej: "Jujutsu Kaisen", "Chainsaw Man")

#### 4. Importación a la Base de Datos
- Validar que cada fila tenga al menos el nombre del producto
- Insertar productos en lotes para mayor eficiencia
- Mostrar progreso de la importación
- Resumen final: productos importados exitosamente y errores

---

### Mapeo de Columnas Propuesto

```text
Excel                    -->  Base de Datos
--------------------------------------------------
Codigo                   -->  sku
Nombre del personaje     -->  name
Anime de origen          -->  category_id (crear si no existe)
Cantidad en stock        -->  stock_quantity
Precio de venta          -->  sale_price
Proveedor                -->  description (como referencia)
Estado                   -->  (ignorado, se calcula por stock)
```

---

### Flujo de Usuario

1. El admin hace clic en "Importar Excel/CSV"
2. Selecciona el archivo desde su computadora
3. El sistema muestra una vista previa con los primeros 5-10 productos
4. El admin confirma la importación
5. Los productos se agregan a la base de datos
6. Se muestra un resumen con el resultado

---

### Detalles Tecnicos

#### Dependencia Nueva
- **xlsx** (SheetJS): Librería para leer archivos Excel en el navegador

#### Componente Nuevo
- `ImportProductsDialog.tsx`: Modal con toda la lógica de importación

#### Modificaciones
- `Products.tsx`: Agregar botón y diálogo de importación

#### Lógica de Categorías
- Buscar categoría existente por nombre exacto
- Si no existe, crearla automáticamente
- Asociar el producto con el ID de la categoría

#### Manejo de Duplicados
- Si un producto con el mismo SKU ya existe, se puede:
  - Omitir (opción por defecto)
  - Actualizar el existente (opción futura)

---

### Interfaz Visual

El botón de importación tendrá el estilo `outline` para diferenciarlo del botón principal:

```text
[ + Nuevo Producto ]  [ ↑ Importar Excel ]
```

El diálogo mostrará:
- Zona de arrastrar y soltar archivo
- Tabla de vista previa
- Barra de progreso durante la importación
- Mensajes de éxito/error claros

