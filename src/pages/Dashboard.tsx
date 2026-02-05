 import { useEffect, useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Package, Users, AlertTriangle, DollarSign } from 'lucide-react';
 import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
 
 interface Stats {
   totalProducts: number;
   lowStockProducts: number;
   totalCustomers: number;
   inventoryValue: number;
 }
 
 interface CategoryValue {
   name: string;
   value: number;
 }
 
 export default function Dashboard() {
   const [stats, setStats] = useState<Stats>({
     totalProducts: 0,
     lowStockProducts: 0,
     totalCustomers: 0,
     inventoryValue: 0,
   });
   const [categoryData, setCategoryData] = useState<CategoryValue[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     const fetchStats = async () => {
       setLoading(true);
       
       const [productsResult, customersResult] = await Promise.all([
         supabase.from('products').select('*'),
         supabase.from('customers').select('id', { count: 'exact', head: true }),
       ]);
 
       const products = productsResult.data || [];
       const totalProducts = products.length;
       const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock).length;
       const inventoryValue = products.reduce((sum, p) => sum + (p.sale_price * p.stock_quantity), 0);
 
       setStats({
         totalProducts,
         lowStockProducts,
         totalCustomers: customersResult.count || 0,
         inventoryValue,
       });
 
       // Fetch category data for chart
       const { data: categories } = await supabase.from('categories').select('id, name');
       
       if (categories && products.length > 0) {
         const categoryValues = categories.map(cat => {
           const categoryProducts = products.filter(p => p.category_id === cat.id);
           const value = categoryProducts.reduce((sum, p) => sum + (p.sale_price * p.stock_quantity), 0);
           return { name: cat.name, value };
         }).filter(c => c.value > 0);
         
         setCategoryData(categoryValues);
       }
 
       setLoading(false);
     };
 
     fetchStats();
   }, []);
 
   const formatCurrency = (value: number) => {
     return new Intl.NumberFormat('es-MX', {
       style: 'currency',
       currency: 'MXN',
     }).format(value);
   };
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
         <p className="text-muted-foreground">Resumen general de tu inventario</p>
       </div>
 
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
             <Package className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{loading ? '...' : stats.totalProducts}</div>
             <p className="text-xs text-muted-foreground">productos en inventario</p>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
             <AlertTriangle className="h-4 w-4 text-warning" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-warning">{loading ? '...' : stats.lowStockProducts}</div>
             <p className="text-xs text-muted-foreground">productos por reabastecer</p>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
             <Users className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{loading ? '...' : stats.totalCustomers}</div>
             <p className="text-xs text-muted-foreground">clientes registrados</p>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Valor del Inventario</CardTitle>
             <DollarSign className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{loading ? '...' : formatCurrency(stats.inventoryValue)}</div>
             <p className="text-xs text-muted-foreground">valor total a precio de venta</p>
           </CardContent>
         </Card>
       </div>
 
       {categoryData.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>Valor del Inventario por Categoría</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                   <XAxis dataKey="name" className="text-muted-foreground text-xs" />
                   <YAxis 
                     className="text-muted-foreground text-xs"
                     tickFormatter={(value) => formatCurrency(value)}
                   />
                   <Tooltip 
                     formatter={(value: number) => formatCurrency(value)}
                     contentStyle={{
                       backgroundColor: 'hsl(var(--card))',
                       border: '1px solid hsl(var(--border))',
                       borderRadius: '8px',
                     }}
                   />
                   <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </CardContent>
         </Card>
       )}
     </div>
   );
 }