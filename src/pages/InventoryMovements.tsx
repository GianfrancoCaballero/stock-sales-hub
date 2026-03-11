import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    RefreshCw,
    Search,
    Plus,
    Loader2,
    TrendingDown,
    ShoppingCart,
    Undo2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Movement {
    id: string;
    product_id: string;
    user_id: string | null;
    movement_type: string;
    quantity: number;
    notes: string | null;
    created_at: string;
    product?: { name: string; sku: string | null } | null;
    profile?: { full_name: string } | null;
}

interface Product {
    id: string;
    name: string;
    sku: string | null;
    stock_quantity: number;
}

const MOVEMENT_TYPES = [
    { value: 'entrada', label: 'Entrada', icon: ArrowDownCircle, color: 'text-green-500', badgeClass: 'bg-green-500/10 text-green-600 border-green-200' },
    { value: 'salida', label: 'Salida', icon: ArrowUpCircle, color: 'text-red-500', badgeClass: 'bg-red-500/10 text-red-600 border-red-200' },
    { value: 'ajuste', label: 'Ajuste', icon: RefreshCw, color: 'text-blue-500', badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-200' },
    { value: 'sale', label: 'Venta', icon: ShoppingCart, color: 'text-orange-500', badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-200' },
    { value: 'sale_return', label: 'Dev. Venta', icon: Undo2, color: 'text-purple-500', badgeClass: 'bg-purple-500/10 text-purple-600 border-purple-200' },
];

function getMovementMeta(type: string) {
    return MOVEMENT_TYPES.find(m => m.value === type) ?? {
        value: type, label: type, icon: RefreshCw, color: 'text-muted-foreground', badgeClass: 'bg-muted text-muted-foreground',
    };
}

export default function InventoryMovements() {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        product_id: '',
        movement_type: 'entrada' as 'entrada' | 'salida' | 'ajuste',
        quantity: 1,
        notes: '',
    });

    const { isAdmin } = useAuth();
    const { toast } = useToast();

    const fetchMovements = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory_movements')
            .select(`
        *,
        product:products(name, sku)
      `)
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
            setLoading(false);
            return;
        }

        const userIds = [...new Set((data || []).map(m => m.user_id).filter(Boolean))];
        let profileMap = new Map<string, string>();

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', userIds);
            profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        }

        const enriched = (data || []).map(m => ({
            ...m,
            profile: m.user_id ? { full_name: profileMap.get(m.user_id) || 'Usuario' } : null,
        }));

        setMovements(enriched as Movement[]);
        setLoading(false);
    };

    const fetchProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('id, name, sku, stock_quantity')
            .order('name');
        setProducts(data || []);
    };

    useEffect(() => {
        fetchMovements();
        fetchProducts();
    }, []);

    const filtered = movements.filter(m => {
        const matchesSearch =
            m.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.notes?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || m.movement_type === typeFilter;
        return matchesSearch && matchesType;
    });

    const handleSave = async () => {
        if (!formData.product_id) {
            toast({ title: 'Error', description: 'Selecciona un producto', variant: 'destructive' });
            return;
        }
        if (formData.quantity <= 0) {
            toast({ title: 'Error', description: 'La cantidad debe ser mayor a 0', variant: 'destructive' });
            return;
        }

        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        // Determinar delta para el stock
        const delta = formData.movement_type === 'entrada'
            ? formData.quantity
            : formData.movement_type === 'salida'
                ? -formData.quantity
                : formData.quantity; // ajuste: puede ser positivo o negativo, aquí se acepta el valor literal

        const { error: movError } = await supabase
            .from('inventory_movements')
            .insert({
                product_id: formData.product_id,
                user_id: user?.id ?? null,
                movement_type: formData.movement_type,
                quantity: formData.movement_type === 'salida' ? -formData.quantity : formData.quantity,
                notes: formData.notes || null,
            });

        if (movError) {
            toast({ title: 'Error', description: movError.message, variant: 'destructive' });
            setSaving(false);
            return;
        }

        // Actualizar stock del producto
        const product = products.find(p => p.id === formData.product_id);
        if (product) {
            const newStock = product.stock_quantity + delta;
            await supabase
                .from('products')
                .update({ stock_quantity: Math.max(0, newStock) })
                .eq('id', formData.product_id);
        }

        toast({ title: 'Éxito', description: 'Movimiento registrado correctamente' });
        setSaving(false);
        setIsDialogOpen(false);
        setFormData({ product_id: '', movement_type: 'entrada', quantity: 1, notes: '' });
        fetchMovements();
        fetchProducts();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Movimientos de Stock</h1>
                    <p className="text-muted-foreground">Historial de entradas, salidas y ajustes de inventario</p>
                </div>

                {isAdmin && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Movimiento
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[440px]">
                            <DialogHeader>
                                <DialogTitle>Registrar Movimiento</DialogTitle>
                                <DialogDescription>
                                    Registra una entrada, salida o ajuste manual de stock
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Producto *</Label>
                                    <Select
                                        value={formData.product_id}
                                        onValueChange={v => setFormData({ ...formData, product_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar producto" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    <span>{p.name}</span>
                                                    {p.sku && <span className="ml-2 text-muted-foreground text-xs">({p.sku})</span>}
                                                    <span className="ml-2 text-muted-foreground text-xs">— Stock: {p.stock_quantity}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo *</Label>
                                        <Select
                                            value={formData.movement_type}
                                            onValueChange={v => setFormData({ ...formData, movement_type: v as 'entrada' | 'salida' | 'ajuste' })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="entrada">Entrada</SelectItem>
                                                <SelectItem value="salida">Salida</SelectItem>
                                                <SelectItem value="ajuste">Ajuste</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Cantidad *</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Notas</Label>
                                    <Textarea
                                        placeholder="Motivo del movimiento..."
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Registrar
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por producto, SKU o notas..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Tipo de movimiento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los tipos</SelectItem>
                                {MOVEMENT_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {searchTerm || typeFilter !== 'all'
                                ? 'No se encontraron movimientos con esos filtros'
                                : 'Aún no hay movimientos registrados'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="text-right">Cantidad</TableHead>
                                        <TableHead>Notas</TableHead>
                                        <TableHead>Usuario</TableHead>
                                        <TableHead>Fecha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map(m => {
                                        const meta = getMovementMeta(m.movement_type);
                                        const Icon = meta.icon;
                                        const isPositive = m.quantity > 0;
                                        return (
                                            <TableRow key={m.id}>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={`gap-1.5 font-medium ${meta.badgeClass}`}
                                                    >
                                                        <Icon className="h-3 w-3" />
                                                        {meta.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{m.product?.name ?? '—'}</p>
                                                        {m.product?.sku && (
                                                            <p className="text-xs text-muted-foreground">{m.product.sku}</p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                        {isPositive ? '+' : ''}{m.quantity}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="max-w-[200px]">
                                                    <span className="text-sm text-muted-foreground truncate block">
                                                        {m.notes ?? '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {m.profile?.full_name ?? '—'}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                    {format(new Date(m.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
