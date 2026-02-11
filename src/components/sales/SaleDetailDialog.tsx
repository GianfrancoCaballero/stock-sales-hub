import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, XCircle, Trash2, Pencil, User, CreditCard, FileText, Banknote, Building2 } from 'lucide-react';
import { useSalesHistory, useSaleDetails, useCancelSale, useUpdateSale, useDeleteSale, useCustomers } from '@/hooks/useSales';
import { useAuth } from '@/hooks/useAuth';

interface SaleDetailDialogProps {
  saleId: string | null;
  onClose: () => void;
}

export default function SaleDetailDialog({ saleId, onClose }: SaleDetailDialogProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  
  const { isAdmin } = useAuth();
  
  const { data: sales } = useSalesHistory({});
  const { data: items, isLoading: loadingItems } = useSaleDetails(saleId);
  const { data: customers } = useCustomers();
  const cancelMutation = useCancelSale();
  const updateMutation = useUpdateSale();
  const deleteMutation = useDeleteSale();

  const sale = sales?.find(s => s.id === saleId);
  const selectedCustomer = customers?.find(c => c.id === editCustomerId);

  const handleCancel = async () => {
    if (!saleId) return;
    await cancelMutation.mutateAsync(saleId);
    setCancelDialogOpen(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!saleId) return;
    await deleteMutation.mutateAsync(saleId);
    setDeleteDialogOpen(false);
    onClose();
  };

  const startEditing = () => {
    if (!sale) return;
    setEditPaymentMethod(sale.payment_method);
    setEditNotes(sale.notes || '');
    setEditCustomerId(sale.customer_id);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!saleId) return;
    await updateMutation.mutateAsync({
      saleId,
      data: {
        payment_method: editPaymentMethod,
        notes: editNotes || null,
        customer_id: editCustomerId,
      },
    });
    setEditing(false);
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
      <Dialog open={!!saleId} onOpenChange={(open) => { if (!open) { setEditing(false); onClose(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalle de Venta</span>
              {isAdmin && !editing && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={startEditing}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </DialogTitle>
            <DialogDescription>
              {format(new Date(sale.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <User className="mr-2 h-4 w-4" />
                        {selectedCustomer ? selectedCustomer.name : 'Cliente General'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>No se encontró cliente</CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="general" onSelect={() => { setEditCustomerId(null); setCustomerOpen(false); }}>
                              <User className="mr-2 h-4 w-4" /> Cliente General
                            </CommandItem>
                            {customers?.map((c) => (
                              <CommandItem key={c.id} value={c.name} onSelect={() => { setEditCustomerId(c.id); setCustomerOpen(false); }}>
                                <User className="mr-2 h-4 w-4" /> {c.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo"><div className="flex items-center gap-2"><Banknote className="h-4 w-4" /> Efectivo</div></SelectItem>
                      <SelectItem value="tarjeta"><div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Tarjeta</div></SelectItem>
                      <SelectItem value="transferencia"><div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Transferencia</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                  <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" /> Cliente
                  </div>
                  <p className="font-medium">{sale.customer?.name || 'Cliente General'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" /> Vendedor
                  </div>
                  <p className="font-medium">{sale.seller?.full_name || 'Usuario'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" /> Método de Pago
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
            )}

            {!editing && sale.notes && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" /> Notas
                </div>
                <p className="text-sm bg-muted p-3 rounded-md">{sale.notes}</p>
              </div>
            )}

            <Separator />

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

            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">${sale.total.toFixed(2)}</span>
            </div>
          </div>

          {!editing && (
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
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Sale Alert */}
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

      {/* Delete Sale Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta venta permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la venta y todos sus registros. Si la venta estaba completada, el stock será restaurado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
