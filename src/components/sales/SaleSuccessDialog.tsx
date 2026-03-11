import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShoppingBag } from 'lucide-react';

interface SaleSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  total: number;
  itemCount: number;
}

export default function SaleSuccessDialog({ open, onClose, total, itemCount }: SaleSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <DialogTitle className="text-2xl">¡Venta Completada!</DialogTitle>
          <DialogDescription>
            La venta se ha registrado correctamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Productos vendidos</span>
              <span className="font-medium">{itemCount}</span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-medium">Total</span>
              <span className="font-bold text-primary">S/ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full" size="lg">
            <ShoppingBag className="mr-2 h-5 w-5" />
            Nueva Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
