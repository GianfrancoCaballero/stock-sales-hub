import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, XCircle, User, CreditCard, FileText } from 'lucide-react';
import { useState } from 'react';
import { useSalesHistory, useSaleDetails, useCancelSale } from '@/hooks/useSales';
import { useAuth } from '@/hooks/useAuth';

interface SaleDetailDialogProps {
  saleId: string | null;
  onClose: () => void;
}

export default function SaleDetailDialog({ saleId, onClose }: SaleDetailDialogProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const { isAdmin } = useAuth();
  
  const { data: sales } = useSalesHistory({});
  const { data: items, isLoading: loadingItems } = useSaleDetails(saleId);
  const cancelMutation = useCancelSale();

  const sale = sales?.find(s => s.id === saleId);

  const handleCancel = async () => {
    if (!saleId) return;
    await cancelMutation.mutateAsync(saleId);
    setCancelDialogOpen(false);
    onClose();
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'tarjeta': return 'Tarjeta';
      case 'transferencia': return 'Transferencia';
      default: return method;
    }
  };

  if (!sale) return null;

  return (
    <>
      <Dialog open={!!saleId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Venta</DialogTitle>
            <DialogDescription>
              {format(new Date(sale.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Sale Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Cliente
                </div>
                <p className="font-medium">{sale.customer?.name || 'Cliente General'}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Vendedor
                </div>
                <p className="font-medium">{sale.seller?.full_name || 'Usuario'}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  Método de Pago
                </div>
                <p className="font-medium">{getPaymentMethodLabel(sale.payment_method)}</p>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Estado</div>
                <Badge variant={sale.status === 'completada' ? 'default' : 'destructive'}>
                  {sale.status === 'completada' ? 'Completada' : 'Cancelada'}
                </Badge>
              </div>
            </div>

            {sale.notes && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Notas
                </div>
                <p className="text-sm bg-muted p-3 rounded-md">{sale.notes}</p>
              </div>
            )}

            <Separator />

            {/* Items */}
            <div>
              <h4 className="font-medium mb-3">Productos Vendidos</h4>
              {loadingItems ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product?.name || 'Producto'}</p>
                            {item.product?.sku && (
                              <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${item.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <Separator />

            {/* Total */}
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">${sale.total.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isAdmin && sale.status === 'completada' && (
              <Button 
                variant="destructive" 
                onClick={() => setCancelDialogOpen(true)}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar Venta
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción restaurará el stock de los productos vendidos. Esta operación no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, cancelar venta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
