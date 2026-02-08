import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CreditCard,
  Banknote,
  Building2,
  User,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProducts, useCustomers, useCreateSale, CartItem } from '@/hooks/useSales';
import SaleSuccessDialog from './SaleSuccessDialog';

interface NewSaleTabProps {
  onSaleComplete?: () => void;
}

export default function NewSaleTab({ onSaleComplete: _onSaleComplete }: NewSaleTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [notes, setNotes] = useState('');
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<{ total: number; items: number } | null>(null);

  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: customers } = useCustomers();
  const createSaleMutation = useCreateSale();

  const filteredProducts = useMemo(() => {
    if (!products || !searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.sku?.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [products, searchQuery]);

  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const addToCart = (product: NonNullable<typeof products>[0]) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock_quantity) {
        setCart(cart.map(item => 
          item.product_id === product.id
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unit_price
              }
            : item
        ));
      }
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        unit_price: product.sale_price,
        stock_quantity: product.stock_quantity,
        subtotal: product.sale_price,
      }]);
    }
    setSearchQuery('');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product_id !== productId) return item;
      
      const newQuantity = item.quantity + delta;
      if (newQuantity < 1 || newQuantity > item.stock_quantity) return item;
      
      return {
        ...item,
        quantity: newQuantity,
        subtotal: newQuantity * item.unit_price,
      };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const handleCompleteSale = async () => {
    const result = await createSaleMutation.mutateAsync({
      customer_id: selectedCustomerId,
      payment_method: paymentMethod,
      notes,
      items: cart,
    });

    if (result) {
      setCompletedSale({ total: cartTotal, items: cart.length });
      setSuccessDialogOpen(true);
    }
  };

  const handleNewSale = () => {
    setCart([]);
    setSelectedCustomerId(null);
    setPaymentMethod('efectivo');
    setNotes('');
    setSuccessDialogOpen(false);
    setCompletedSale(null);
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Product Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Productos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : searchQuery.trim() && filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron productos
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredProducts.map((product) => {
                    const cartItem = cart.find(item => item.product_id === product.id);
                    const isLowStock = product.stock_quantity <= (product.min_stock || 5);
                    const availableStock = product.stock_quantity - (cartItem?.quantity || 0);
                    
                    return (
                      <Card 
                        key={product.id} 
                        className={cn(
                          "transition-colors",
                          isLowStock && "border-warning/50"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{product.name}</h4>
                              {product.sku && (
                                <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge 
                                  variant={isLowStock ? "destructive" : "secondary"}
                                  className="text-xs"
                                >
                                  {isLowStock && <AlertTriangle className="h-3 w-3 mr-1" />}
                                  Stock: {availableStock}
                                </Badge>
                                {cartItem && (
                                  <Badge variant="outline" className="text-xs">
                                    En carrito: {cartItem.quantity}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-lg">
                                ${product.sale_price.toFixed(2)}
                              </p>
                              <Button
                                size="sm"
                                onClick={() => addToCart(product)}
                                disabled={availableStock <= 0}
                                className="mt-2"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Agregar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {!searchQuery.trim() && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Escribe para buscar productos</p>
                <p className="text-sm mt-1">Puedes buscar por nombre o código SKU</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Carrito
              {cart.length > 0 && (
                <Badge variant="secondary">{cart.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>El carrito está vacío</p>
                <p className="text-sm mt-1">Busca y agrega productos para comenzar</p>
              </div>
            ) : (
              <>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const isLowStock = item.quantity >= item.stock_quantity;
                      
                      return (
                        <div 
                          key={item.product_id}
                          className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              ${item.unit_price.toFixed(2)} c/u
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.product_id, -1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className={cn(
                              "w-8 text-center font-medium",
                              isLowStock && "text-destructive"
                            )}>
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.product_id, 1)}
                              disabled={item.quantity >= item.stock_quantity}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className="font-semibold">${item.subtotal.toFixed(2)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeFromCart(item.product_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <Separator />

                {/* Customer Selection */}
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerOpen}
                        className="w-full justify-start"
                      >
                        <User className="mr-2 h-4 w-4" />
                        {selectedCustomer ? selectedCustomer.name : "Cliente General"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>No se encontró cliente</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="general"
                              onSelect={() => {
                                setSelectedCustomerId(null);
                                setCustomerOpen(false);
                              }}
                            >
                              <User className="mr-2 h-4 w-4" />
                              Cliente General
                            </CommandItem>
                            {customers?.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.name}
                                onSelect={() => {
                                  setSelectedCustomerId(customer.id);
                                  setCustomerOpen(false);
                                }}
                              >
                                <User className="mr-2 h-4 w-4" />
                                {customer.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Efectivo
                        </div>
                      </SelectItem>
                      <SelectItem value="tarjeta">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Tarjeta
                        </div>
                      </SelectItem>
                      <SelectItem value="transferencia">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Transferencia
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    placeholder="Agregar notas a la venta..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <Separator />

                {/* Total */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">${cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleCompleteSale}
                  disabled={createSaleMutation.isPending || cart.length === 0}
                >
                  {createSaleMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                  )}
                  Completar Venta
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <SaleSuccessDialog
        open={successDialogOpen}
        onClose={handleNewSale}
        total={completedSale?.total || 0}
        itemCount={completedSale?.items || 0}
      />
    </>
  );
}
