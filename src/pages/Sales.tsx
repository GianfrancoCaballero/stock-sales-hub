import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, History } from 'lucide-react';
import NewSaleTab from '@/components/sales/NewSaleTab';
import SalesHistoryTab from '@/components/sales/SalesHistoryTab';

export default function Sales() {
  const [activeTab, setActiveTab] = useState('new-sale');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Ventas</h1>
        <p className="text-muted-foreground">Registra nuevas ventas y consulta el historial</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="new-sale" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Nueva Venta
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="new-sale" className="mt-6">
          <NewSaleTab onSaleComplete={() => setActiveTab('history')} />
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <SalesHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
