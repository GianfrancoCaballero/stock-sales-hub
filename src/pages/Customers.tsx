 import { useEffect, useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 import { useToast } from '@/hooks/use-toast';
 import { Plus, Search, Pencil, Trash2, Loader2, Mail, Phone } from 'lucide-react';
 
 interface Customer {
   id: string;
   name: string;
   email: string | null;
   phone: string | null;
   address: string | null;
   notes: string | null;
   created_at: string;
 }
 
 const emptyCustomer = {
   name: '',
   email: '',
   phone: '',
   address: '',
   notes: '',
 };
 
 export default function Customers() {
   const [customers, setCustomers] = useState<Customer[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchTerm, setSearchTerm] = useState('');
   const [isDialogOpen, setIsDialogOpen] = useState(false);
   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
   const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
   const [formData, setFormData] = useState(emptyCustomer);
   const [saving, setSaving] = useState(false);
   
   const { isAdmin } = useAuth();
   const { toast } = useToast();
 
   const fetchData = async () => {
     setLoading(true);
     const { data } = await supabase.from('customers').select('*').order('name');
     if (data) setCustomers(data);
     setLoading(false);
   };
 
   useEffect(() => {
     fetchData();
   }, []);
 
   const filteredCustomers = customers.filter(customer =>
     customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     customer.phone?.includes(searchTerm)
   );
 
   const handleOpenDialog = (customer?: Customer) => {
     if (customer) {
       setSelectedCustomer(customer);
       setFormData({
         name: customer.name,
         email: customer.email || '',
         phone: customer.phone || '',
         address: customer.address || '',
         notes: customer.notes || '',
       });
     } else {
       setSelectedCustomer(null);
       setFormData(emptyCustomer);
     }
     setIsDialogOpen(true);
   };
 
   const handleSave = async () => {
     if (!formData.name.trim()) {
       toast({
         title: 'Error',
         description: 'El nombre del cliente es requerido',
         variant: 'destructive',
       });
       return;
     }
 
     setSaving(true);
     
     const customerData = {
       name: formData.name,
       email: formData.email || null,
       phone: formData.phone || null,
       address: formData.address || null,
       notes: formData.notes || null,
     };
 
     let error;
     if (selectedCustomer) {
       const result = await supabase
         .from('customers')
         .update(customerData)
         .eq('id', selectedCustomer.id);
       error = result.error;
     } else {
       const result = await supabase.from('customers').insert(customerData);
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
         description: selectedCustomer ? 'Cliente actualizado' : 'Cliente creado',
       });
       setIsDialogOpen(false);
       fetchData();
     }
   };
 
   const handleDelete = async () => {
     if (!selectedCustomer) return;
 
     const { error } = await supabase
       .from('customers')
       .delete()
       .eq('id', selectedCustomer.id);
 
     if (error) {
       toast({
         title: 'Error',
         description: error.message,
         variant: 'destructive',
       });
     } else {
       toast({
         title: 'Éxito',
         description: 'Cliente eliminado',
       });
       setIsDeleteDialogOpen(false);
       fetchData();
     }
   };
 
   return (
     <div className="space-y-6">
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
         <div>
           <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
           <p className="text-muted-foreground">Gestiona tu directorio de clientes</p>
         </div>
         
         {isAdmin && (
           <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
             <DialogTrigger asChild>
               <Button onClick={() => handleOpenDialog()}>
                 <Plus className="mr-2 h-4 w-4" />
                 Nuevo Cliente
               </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[500px]">
               <DialogHeader>
                 <DialogTitle>
                   {selectedCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                 </DialogTitle>
                 <DialogDescription>
                   {selectedCustomer ? 'Modifica los datos del cliente' : 'Agrega un nuevo cliente al directorio'}
                 </DialogDescription>
               </DialogHeader>
               
               <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                   <Label htmlFor="name">Nombre *</Label>
                   <Input
                     id="name"
                     value={formData.name}
                     onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                   />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="email">Email</Label>
                     <Input
                       id="email"
                       type="email"
                       value={formData.email}
                       onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="phone">Teléfono</Label>
                     <Input
                       id="phone"
                       value={formData.phone}
                       onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                     />
                   </div>
                 </div>
                 
                 <div className="space-y-2">
                   <Label htmlFor="address">Dirección</Label>
                   <Input
                     id="address"
                     value={formData.address}
                     onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                   />
                 </div>
                 
                 <div className="space-y-2">
                   <Label htmlFor="notes">Notas</Label>
                   <Textarea
                     id="notes"
                     value={formData.notes}
                     onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                     rows={3}
                   />
                 </div>
               </div>
               
               <DialogFooter>
                 <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                   Cancelar
                 </Button>
                 <Button onClick={handleSave} disabled={saving}>
                   {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   {selectedCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
                 </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
         )}
       </div>
 
       <Card>
         <CardHeader>
           <div className="flex items-center gap-4">
             <div className="relative flex-1 max-w-sm">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Buscar por nombre, email o teléfono..."
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
           ) : filteredCustomers.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
             </div>
           ) : (
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Nombre</TableHead>
                     <TableHead>Contacto</TableHead>
                     <TableHead>Dirección</TableHead>
                     {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredCustomers.map((customer) => (
                     <TableRow key={customer.id}>
                       <TableCell className="font-medium">{customer.name}</TableCell>
                       <TableCell>
                         <div className="space-y-1">
                           {customer.email && (
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                               <Mail className="h-3 w-3" />
                               {customer.email}
                             </div>
                           )}
                           {customer.phone && (
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                               <Phone className="h-3 w-3" />
                               {customer.phone}
                             </div>
                           )}
                           {!customer.email && !customer.phone && '-'}
                         </div>
                       </TableCell>
                       <TableCell className="text-muted-foreground">
                         {customer.address || '-'}
                       </TableCell>
                       {isAdmin && (
                         <TableCell className="text-right">
                           <div className="flex items-center justify-end gap-2">
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => handleOpenDialog(customer)}
                             >
                               <Pencil className="h-4 w-4" />
                             </Button>
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => {
                                 setSelectedCustomer(customer);
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
             <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
             <AlertDialogDescription>
               Esta acción no se puede deshacer. Se eliminará permanentemente el cliente
               "{selectedCustomer?.name}" del directorio.
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