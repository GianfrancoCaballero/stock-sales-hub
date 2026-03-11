import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    FileSpreadsheet,
    FileText,
    TrendingUp,
    ShoppingCart,
    BanknoteIcon,
    Loader2,
    BarChart3,
    Search,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SaleRow {
    id: string;
    created_at: string;
    total: number;
    payment_method: string;
    status: string;
    notes: string | null;
    customer_name: string;
    seller_name: string;
}

const PAYMENT_LABELS: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
};

const STATUS_LABELS: Record<string, string> = {
    completada: 'Completada',
    cancelada: 'Cancelada',
};

function formatCurrency(v: number) {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v);
}

export default function Reports() {
    const today = new Date();
    const [dateFrom, setDateFrom] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('completada');
    const [searchTerm, setSearchTerm] = useState('');

    const [sales, setSales] = useState<SaleRow[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    /* ── Fetch ── */
    const fetchReport = async () => {
        setLoading(true);

        let q = supabase
            .from('sales')
            .select('*, customer:customers(name)')
            .gte('created_at', dateFrom)
            .lte('created_at', dateTo + 'T23:59:59')
            .order('created_at', { ascending: false });

        if (paymentFilter !== 'all') q = q.eq('payment_method', paymentFilter);
        if (statusFilter !== 'all') q = q.eq('status', statusFilter);

        const { data, error } = await q;
        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
            setLoading(false);
            return;
        }

        // Enrich with seller names
        const userIds = [...new Set((data || []).map(s => s.user_id).filter(Boolean))];
        let profileMap = new Map<string, string>();
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', userIds);
            profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        }

        const rows: SaleRow[] = (data || []).map(s => ({
            id: s.id,
            created_at: s.created_at,
            total: s.total,
            payment_method: s.payment_method,
            status: s.status,
            notes: s.notes,
            customer_name: (s.customer as any)?.name ?? 'Cliente general',
            seller_name: profileMap.get(s.user_id) ?? 'Usuario',
        }));

        setSales(rows);
        setLoading(false);
    };

    useEffect(() => { fetchReport(); }, []);

    /* ── Filtered ── */
    const filtered = sales.filter(s => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
            s.customer_name.toLowerCase().includes(q) ||
            s.seller_name.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q)
        );
    });

    /* ── Stats ── */
    const completedSales = filtered.filter(s => s.status === 'completada');
    const totalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0);
    const avgTicket = completedSales.length > 0 ? totalRevenue / completedSales.length : 0;

    /* ── Export Excel ── */
    const exportExcel = () => {
        if (filtered.length === 0) {
            toast({ title: 'Sin datos', description: 'No hay ventas para exportar', variant: 'destructive' });
            return;
        }

        const rows = filtered.map(s => ({
            'ID Venta': s.id.slice(0, 8).toUpperCase(),
            'Fecha': format(new Date(s.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
            'Cliente': s.customer_name,
            'Vendedor': s.seller_name,
            'Método de pago': PAYMENT_LABELS[s.payment_method] ?? s.payment_method,
            'Estado': STATUS_LABELS[s.status] ?? s.status,
            'Total (S/)': s.total,
            'Notas': s.notes ?? '',
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
            { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 20 },
            { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 28 },
        ];

        // Summary sheet
        const summaryRows = [
            { Métrica: 'Período', Valor: `${dateFrom} → ${dateTo}` },
            { Métrica: 'Total ventas', Valor: filtered.length },
            { Métrica: 'Ventas completadas', Valor: completedSales.length },
            { Métrica: 'Ingresos totales', Valor: totalRevenue },
            { Métrica: 'Ticket promedio', Valor: avgTicket },
        ];
        const ws2 = XLSX.utils.json_to_sheet(summaryRows);
        ws2['!cols'] = [{ wch: 22 }, { wch: 26 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');
        XLSX.utils.book_append_sheet(wb, ws, 'Ventas detalle');
        XLSX.writeFile(wb, `Reporte_Ventas_${dateFrom}_${dateTo}.xlsx`);

        toast({ title: '¡Excel exportado!', description: `${filtered.length} ventas exportadas` });
    };

    /* ── Export PDF ── */
    const exportPDF = () => {
        if (filtered.length === 0) {
            toast({ title: 'Sin datos', description: 'No hay ventas para exportar', variant: 'destructive' });
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape' });

        // Header
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text('Reporte de Ventas — Dashboard Minifig', 14, 16);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${dateFrom}  →  ${dateTo}`, 14, 24);
        doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 30);

        // Summary boxes
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        const summaryY = 38;
        doc.text(`Total ventas: ${filtered.length}`, 14, summaryY);
        doc.text(`Completadas: ${completedSales.length}`, 80, summaryY);
        doc.text(`Ingresos: ${formatCurrency(totalRevenue)}`, 160, summaryY);
        doc.text(`Ticket prom.: ${formatCurrency(avgTicket)}`, 230, summaryY);

        // Table
        autoTable(doc, {
            startY: summaryY + 8,
            head: [['# Venta', 'Fecha', 'Cliente', 'Vendedor', 'Pago', 'Estado', 'Total']],
            body: filtered.map(s => [
                s.id.slice(0, 8).toUpperCase(),
                format(new Date(s.created_at), 'dd/MM/yy HH:mm', { locale: es }),
                s.customer_name,
                s.seller_name,
                PAYMENT_LABELS[s.payment_method] ?? s.payment_method,
                STATUS_LABELS[s.status] ?? s.status,
                formatCurrency(s.total),
            ]),
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 248, 252] },
            columnStyles: { 6: { halign: 'right' } },
        });

        doc.save(`Reporte_Ventas_${dateFrom}_${dateTo}.pdf`);
        toast({ title: '¡PDF exportado!', description: `${filtered.length} ventas exportadas` });
    };

    /* ── Render ── */
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Reporte de Ventas</h1>
                    <p className="text-muted-foreground">Analiza y exporta el historial de ventas</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportExcel} disabled={loading || filtered.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                        Exportar Excel
                    </Button>
                    <Button variant="outline" onClick={exportPDF} disabled={loading || filtered.length === 0}>
                        <FileText className="mr-2 h-4 w-4 text-red-500" />
                        Exportar PDF
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs">Desde</Label>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Hasta</Label>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Método de pago</Label>
                            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="efectivo">Efectivo</SelectItem>
                                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                    <SelectItem value="transferencia">Transferencia</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Estado</Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="completada">Completadas</SelectItem>
                                    <SelectItem value="cancelada">Canceladas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={fetchReport} disabled={loading} className="w-full">
                                {loading
                                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    : <BarChart3 className="mr-2 h-4 w-4" />}
                                Generar
                            </Button>
                        </div>
                    </div>

                    {/* Search dentro del reporte */}
                    <div className="mt-4 relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar en resultados..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Stats cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : filtered.length}</div>
                        <p className="text-xs text-muted-foreground">en el período</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{loading ? '...' : completedSales.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {filtered.length > 0
                                ? `${Math.round((completedSales.length / filtered.length) * 100)}% del total`
                                : '—'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                        <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : formatCurrency(totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">solo ventas completadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? '...' : formatCurrency(avgTicket)}</div>
                        <p className="text-xs text-muted-foreground">por venta completada</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="pt-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No se encontraron ventas para los filtros seleccionados
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Vendedor</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                #{s.id.slice(0, 8).toUpperCase()}
                                            </TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">
                                                {format(new Date(s.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                                            </TableCell>
                                            <TableCell>{s.customer_name}</TableCell>
                                            <TableCell className="text-muted-foreground">{s.seller_name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {PAYMENT_LABELS[s.payment_method] ?? s.payment_method}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        s.status === 'completada'
                                                            ? 'bg-green-500/10 text-green-600 border-green-200'
                                                            : 'bg-red-500/10 text-red-600 border-red-200'
                                                    }
                                                >
                                                    {STATUS_LABELS[s.status] ?? s.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatCurrency(s.total)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
