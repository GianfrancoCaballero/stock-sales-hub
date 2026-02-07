import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface ParsedProduct {
  sku: string;
  name: string;
  category: string;
  stock_quantity: number;
  sale_price: number;
  description: string;
}

interface ImportResult {
  success: number;
  errors: string[];
  skipped: number;
}

interface ImportProductsDialogProps {
  onImportComplete: () => void;
  existingCategories: { id: string; name: string }[];
}

export default function ImportProductsDialog({ 
  onImportComplete, 
  existingCategories 
}: ImportProductsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setParsedData([]);
    setProgress(0);
    setResult(null);
    setImporting(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  };

  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        if (jsonData.length < 2) {
          toast({
            title: 'Error',
            description: 'El archivo está vacío o no tiene datos',
            variant: 'destructive',
          });
          return;
        }

        // Find column indices based on headers
        const headers = (jsonData[0] as string[]).map(h => h?.toString().toLowerCase().trim() || '');
        const colMap = {
          codigo: headers.findIndex(h => h.includes('codigo') || h.includes('código') || h === 'sku'),
          nombre: headers.findIndex(h => h.includes('nombre') || h.includes('personaje') || h === 'name'),
          categoria: headers.findIndex(h => h.includes('anime') || h.includes('categoria') || h.includes('categoría')),
          cantidad: headers.findIndex(h => h.includes('cantidad') || h.includes('stock')),
          precio: headers.findIndex(h => h.includes('precio') || h.includes('venta') || h.includes('price')),
          proveedor: headers.findIndex(h => h.includes('proveedor') || h.includes('supplier')),
        };

        // Parse rows
        const products: ParsedProduct[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as (string | number)[];
          if (!row || row.length === 0) continue;

          const name = colMap.nombre >= 0 ? String(row[colMap.nombre] || '').trim() : '';
          if (!name) continue; // Skip rows without name

          const priceValue = colMap.precio >= 0 ? row[colMap.precio] : 0;
          const price = typeof priceValue === 'number' ? priceValue : 
            parseFloat(String(priceValue).replace(/[^0-9.-]/g, '')) || 0;

          const stockValue = colMap.cantidad >= 0 ? row[colMap.cantidad] : 0;
          const stock = typeof stockValue === 'number' ? Math.floor(stockValue) : 
            parseInt(String(stockValue).replace(/[^0-9]/g, '')) || 0;

          products.push({
            sku: colMap.codigo >= 0 ? String(row[colMap.codigo] || '').trim() : '',
            name,
            category: colMap.categoria >= 0 ? String(row[colMap.categoria] || '').trim() : '',
            stock_quantity: stock,
            sale_price: price,
            description: colMap.proveedor >= 0 ? `Proveedor: ${String(row[colMap.proveedor] || '').trim()}` : '',
          });
        }

        if (products.length === 0) {
          toast({
            title: 'Error',
            description: 'No se encontraron productos válidos en el archivo',
            variant: 'destructive',
          });
          return;
        }

        setParsedData(products);
        toast({
          title: 'Archivo procesado',
          description: `Se encontraron ${products.length} productos`,
        });
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({
          title: 'Error',
          description: 'No se pudo procesar el archivo',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      parseExcelFile(file);
    } else {
      toast({
        title: 'Archivo no soportado',
        description: 'Por favor sube un archivo .xlsx, .xls o .csv',
        variant: 'destructive',
      });
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const getUniqueCategories = () => {
    const categories = new Set(parsedData.map(p => p.category).filter(Boolean));
    return Array.from(categories);
  };

  const getNewCategories = () => {
    const existingNames = existingCategories.map(c => c.name.toLowerCase());
    return getUniqueCategories().filter(cat => !existingNames.includes(cat.toLowerCase()));
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    const errors: string[] = [];
    let success = 0;
    let skipped = 0;

    try {
      // Step 1: Get or create categories
      const categoryMap = new Map<string, string>();
      for (const cat of existingCategories) {
        categoryMap.set(cat.name.toLowerCase(), cat.id);
      }

      const newCategories = getNewCategories();
      if (newCategories.length > 0) {
        const { data: createdCategories, error } = await supabase
          .from('categories')
          .insert(newCategories.map(name => ({ name })))
          .select();

        if (error) {
          errors.push(`Error creando categorías: ${error.message}`);
        } else if (createdCategories) {
          for (const cat of createdCategories) {
            categoryMap.set(cat.name.toLowerCase(), cat.id);
          }
        }
      }

      setProgress(20);

      // Step 2: Check for existing SKUs
      const skusToCheck = parsedData.filter(p => p.sku).map(p => p.sku);
      const { data: existingProducts } = await supabase
        .from('products')
        .select('sku')
        .in('sku', skusToCheck);

      const existingSkus = new Set((existingProducts || []).map(p => p.sku));
      setProgress(40);

      // Step 3: Insert products in batches
      const productsToInsert = parsedData.filter(p => {
        if (p.sku && existingSkus.has(p.sku)) {
          skipped++;
          return false;
        }
        return true;
      });

      const batchSize = 20;
      const totalBatches = Math.ceil(productsToInsert.length / batchSize);

      for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize).map(p => ({
          name: p.name,
          sku: p.sku || null,
          category_id: p.category ? categoryMap.get(p.category.toLowerCase()) || null : null,
          stock_quantity: p.stock_quantity,
          sale_price: p.sale_price,
          description: p.description || null,
          purchase_price: 0,
          min_stock: 0,
        }));

        const { error } = await supabase.from('products').insert(batch);

        if (error) {
          errors.push(`Error en lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          success += batch.length;
        }

        const progressPercent = 40 + ((Math.floor(i / batchSize) + 1) / totalBatches) * 60;
        setProgress(Math.min(progressPercent, 100));
      }

      setResult({ success, errors, skipped });

      if (success > 0) {
        toast({
          title: 'Importación completada',
          description: `${success} productos importados exitosamente`,
        });
        onImportComplete();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error durante la importación',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Productos</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx, .xls) o CSV con los datos de tus productos
          </DialogDescription>
        </DialogHeader>

        {!parsedData.length && !result && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Arrastra y suelta tu archivo aquí, o
            </p>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Seleccionar archivo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-4">
              Formatos soportados: .xlsx, .xls, .csv
            </p>
          </div>
        )}

        {parsedData.length > 0 && !result && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="secondary">
                  {parsedData.length} productos
                </Badge>
                {getNewCategories().length > 0 && (
                  <Badge variant="outline">
                    {getNewCategories().length} categorías nuevas
                  </Badge>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((product, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">
                          {product.sku || '-'}
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category || '-'}</TableCell>
                        <TableCell className="text-right">{product.stock_quantity}</TableCell>
                        <TableCell className="text-right">
                          ${product.sale_price.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... y {parsedData.length - 10} productos más
                </p>
              )}
            </div>

            {importing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importando productos...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => resetState()} disabled={importing}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar {parsedData.length} productos
              </Button>
            </DialogFooter>
          </>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Importación finalizada
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-success">{result.success}</div>
                <div className="text-sm text-muted-foreground">Importados</div>
              </div>
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-warning">{result.skipped}</div>
                <div className="text-sm text-muted-foreground">Omitidos (SKU duplicado)</div>
              </div>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-destructive">{result.errors.length}</div>
                <div className="text-sm text-muted-foreground">Errores</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Errores encontrados:</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
