import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, AlertTriangle, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import ImportProductsDialog from '@/components/products/ImportProductsDialog';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category_id: string | null;
  purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

const emptyProduct = {
  name: '',
  description: '',
  sku: '',
  category_id: '',
  purchase_price: 0,
  sale_price: 0,
  stock_quantity: 0,
  min_stock: 0,
  is_active: true,
  image_url: '',
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);

  const { isAdmin } = useAuth();
  const { toast } = useToast();

  /* ── Export Stock Excel ── */
  const exportStockExcel = () => {
    if (filteredProducts.length === 0) {
      toast({ title: 'Sin datos', description: 'No hay productos para exportar', variant: 'destructive' });
      return;
    }

    const rows = filteredProducts.map(p => ({
      'Nombre': p.name,
      'SKU': p.sku ?? '-',
      'Categoría': getCategoryName(p.category_id),
      'Precio Compra (S/)': p.purchase_price,
      'Precio Venta (S/)': p.sale_price,
      'Stock Actual': p.stock_quantity,
      'Stock Mínimo': p.min_stock,
      'Estado Stock': p.stock_quantity <= p.min_stock ? 'BAJO' : 'OK',
      'Visible Tienda': p.is_active ? 'Sí' : 'No',
    }));

    const totalValue = filteredProducts.reduce((sum, p) => sum + p.purchase_price * p.stock_quantity, 0);
    const lowStock = filteredProducts.filter(p => p.stock_quantity <= p.min_stock).length;

    const summaryRows = [
      { Métrica: 'Total de productos', Valor: filteredProducts.length },
      { Métrica: 'Productos con stock bajo', Valor: lowStock },
      { Métrica: 'Valor total del inventario (S/)', Valor: totalValue.toFixed(2) },
      { Métrica: 'Generado', Valor: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es }) },
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 28 }, { wch: 14 }, { wch: 20 }, { wch: 18 },
      { wch: 18 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 14 },
    ];

    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    ws2['!cols'] = [{ wch: 34 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Detalle');
    XLSX.writeFile(wb, `Reporte_Stock_${format(new Date(), 'yyyyMMdd')}.xlsx`);

    toast({ title: '¡Excel exportado!', description: `${filteredProducts.length} productos exportados` });
  };

  /* ── Export Stock PDF ── */
  const exportStockPDF = () => {
    if (filteredProducts.length === 0) {
      toast({ title: 'Sin datos', description: 'No hay productos para exportar', variant: 'destructive' });
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const totalValue = filteredProducts.reduce((sum, p) => sum + p.purchase_price * p.stock_quantity, 0);
    const lowStock = filteredProducts.filter(p => p.stock_quantity <= p.min_stock).length;
    const formatCurrencyLocal = (v: number) =>
      new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v);

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Reporte de Stock Actual — Inventario', 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 24);

    // Summary
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    const summaryY = 32;
    doc.text(`Total productos: ${filteredProducts.length}`, 14, summaryY);
    doc.text(`Stock bajo: ${lowStock}`, 90, summaryY);
    doc.text(`Valor inventario: ${formatCurrencyLocal(totalValue)}`, 160, summaryY);

    // Table
    autoTable(doc, {
      startY: summaryY + 8,
      head: [['Nombre', 'SKU', 'Categoría', 'P. Compra', 'P. Venta', 'Stock', 'Mín.', 'Estado', 'Tienda']],
      body: filteredProducts.map(p => [
        p.name,
        p.sku ?? '-',
        getCategoryName(p.category_id),
        formatCurrencyLocal(p.purchase_price),
        formatCurrencyLocal(p.sale_price),
        p.stock_quantity,
        p.min_stock,
        p.stock_quantity <= p.min_stock ? 'BAJO' : 'OK',
        p.is_active ? 'Sí' : 'No',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          const val = data.cell.raw as string;
          if (val === 'BAJO') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [22, 163, 74];
          }
        }
      },
    });

    doc.save(`Reporte_Stock_${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast({ title: '¡PDF exportado!', description: `${filteredProducts.length} productos exportados` });
  };

  const fetchData = async () => {
    setLoading(true);
    const [productsResult, categoriesResult] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ]);

    if (productsResult.data) setProducts(productsResult.data);
    if (categoriesResult.data) setCategories(categoriesResult.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '-';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(value);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        category_id: product.category_id || '',
        purchase_price: product.purchase_price,
        sale_price: product.sale_price,
        stock_quantity: product.stock_quantity,
        min_stock: product.min_stock,
        is_active: product.is_active,
        image_url: product.image_url || '',
      });
    } else {
      setSelectedProduct(null);
      setFormData(emptyProduct);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del producto es requerido',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const productData = {
      name: formData.name,
      description: formData.description || null,
      sku: formData.sku || null,
      category_id: formData.category_id || null,
      purchase_price: formData.purchase_price,
      sale_price: formData.sale_price,
      stock_quantity: formData.stock_quantity,
      min_stock: formData.min_stock,
      is_active: formData.is_active,
      image_url: formData.image_url || null,
    };

    let error;
    if (selectedProduct) {
      const result = await supabase
        .from('products')
        .update(productData)
        .eq('id', selectedProduct.id);
      error = result.error;
    } else {
      const result = await supabase.from('products').insert(productData);
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Éxito',
        description: selectedProduct ? 'Producto actualizado' : 'Producto creado',
      });
      setIsDialogOpen(false);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', selectedProduct.id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Éxito',
        description: 'Producto eliminado',
      });
      setIsDeleteDialogOpen(false);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Productos</h1>
          <p className="text-muted-foreground">Gestiona tu inventario de productos</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={exportStockExcel}
            disabled={loading || filteredProducts.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            onClick={exportStockPDF}
            disabled={loading || filteredProducts.length === 0}
          >
            <FileText className="mr-2 h-4 w-4 text-red-500" />
            Exportar PDF
          </Button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <ImportProductsDialog
              onImportComplete={fetchData}
              existingCategories={categories}
            />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedProduct ? 'Modifica los datos del producto' : 'Agrega un nuevo producto al inventario'}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchase_price">Precio de Compra</Label>
                      <Input
                        id="purchase_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.purchase_price}
                        onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sale_price">Precio de Venta</Label>
                      <Input
                        id="sale_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.sale_price}
                        onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Stock Actual</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_stock">Stock Mínimo</Label>
                      <Input
                        id="min_stock"
                        type="number"
                        min="0"
                        value={formData.min_stock}
                        onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image_url">URL de Imagen</Label>
                    <Input
                      id="image_url"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_active">Visible en tienda</Label>
                      <p className="text-sm text-muted-foreground">El producto aparecerá en el e-commerce</p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedProduct ? 'Guardar Cambios' : 'Crear Producto'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No se encontraron productos' : 'No hay productos registrados'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-center">Tienda</TableHead>
                    {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{product.sku || '-'}</TableCell>
                      <TableCell>{getCategoryName(product.category_id)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {product.stock_quantity <= product.min_stock && (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                          <Badge variant={product.stock_quantity <= product.min_stock ? 'destructive' : 'secondary'}>
                            {product.stock_quantity}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={product.is_active ? 'default' : 'outline'}>
                          {product.is_active ? 'Visible' : 'Oculto'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el producto
              "{selectedProduct?.name}" del inventario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}