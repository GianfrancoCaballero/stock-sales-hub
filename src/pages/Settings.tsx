 import { useEffect, useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
 import { Badge } from '@/components/ui/badge';
 import { useToast } from '@/hooks/use-toast';
 import { Plus, Pencil, Trash2, Loader2, Tags, ShieldCheck, User } from 'lucide-react';
 
 interface Category {
   id: string;
   name: string;
   description: string | null;
 }
 
 interface UserProfile {
   id: string;
   user_id: string;
   full_name: string;
   email: string | null;
   role?: 'admin' | 'vendedor';
 }
 
 export default function Settings() {
   const [categories, setCategories] = useState<Category[]>([]);
   const [users, setUsers] = useState<UserProfile[]>([]);
   const [loading, setLoading] = useState(true);
   const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
   const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
   const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
   const [saving, setSaving] = useState(false);
   
   const { isAdmin } = useAuth();
   const { toast } = useToast();
 
   const fetchData = async () => {
     setLoading(true);
     
     const [categoriesResult, profilesResult, rolesResult] = await Promise.all([
       supabase.from('categories').select('*').order('name'),
       supabase.from('profiles').select('*').order('full_name'),
       supabase.from('user_roles').select('user_id, role'),
     ]);
 
     if (categoriesResult.data) setCategories(categoriesResult.data);
     
     if (profilesResult.data && rolesResult.data) {
       const usersWithRoles = profilesResult.data.map(profile => {
         const userRole = rolesResult.data.find(r => r.user_id === profile.user_id);
         return {
           ...profile,
           role: userRole?.role as 'admin' | 'vendedor' || 'vendedor',
         };
       });
       setUsers(usersWithRoles);
     }
     
     setLoading(false);
   };
 
   useEffect(() => {
     fetchData();
   }, []);
 
   const handleOpenCategoryDialog = (category?: Category) => {
     if (category) {
       setSelectedCategory(category);
       setCategoryForm({
         name: category.name,
         description: category.description || '',
       });
     } else {
       setSelectedCategory(null);
       setCategoryForm({ name: '', description: '' });
     }
     setCategoryDialogOpen(true);
   };
 
   const handleSaveCategory = async () => {
     if (!categoryForm.name.trim()) {
       toast({
         title: 'Error',
         description: 'El nombre de la categoría es requerido',
         variant: 'destructive',
       });
       return;
     }
 
     setSaving(true);
     
     const categoryData = {
       name: categoryForm.name,
       description: categoryForm.description || null,
     };
 
     let error;
     if (selectedCategory) {
       const result = await supabase
         .from('categories')
         .update(categoryData)
         .eq('id', selectedCategory.id);
       error = result.error;
     } else {
       const result = await supabase.from('categories').insert(categoryData);
       error = result.error;
     }
 
     setSaving(false);
 
     if (error) {
       let message = error.message;
       if (error.message.includes('duplicate')) {
         message = 'Ya existe una categoría con ese nombre';
       }
       toast({
         title: 'Error',
         description: message,
         variant: 'destructive',
       });
     } else {
       toast({
         title: 'Éxito',
         description: selectedCategory ? 'Categoría actualizada' : 'Categoría creada',
       });
       setCategoryDialogOpen(false);
       fetchData();
     }
   };
 
   const handleDeleteCategory = async () => {
     if (!selectedCategory) return;
 
     const { error } = await supabase
       .from('categories')
       .delete()
       .eq('id', selectedCategory.id);
 
     if (error) {
       toast({
         title: 'Error',
         description: error.message,
         variant: 'destructive',
       });
     } else {
       toast({
         title: 'Éxito',
         description: 'Categoría eliminada',
       });
       setDeleteDialogOpen(false);
       fetchData();
     }
   };
 
   const handleToggleUserRole = async (user: UserProfile) => {
     const newRole = user.role === 'admin' ? 'vendedor' : 'admin';
     
     const { error } = await supabase
       .from('user_roles')
       .update({ role: newRole })
       .eq('user_id', user.user_id);
 
     if (error) {
       toast({
         title: 'Error',
         description: error.message,
         variant: 'destructive',
       });
     } else {
       toast({
         title: 'Éxito',
         description: `Rol actualizado a ${newRole === 'admin' ? 'Administrador' : 'Vendedor'}`,
       });
       fetchData();
     }
   };
 
   if (!isAdmin) {
     return (
       <div className="flex items-center justify-center h-64">
         <p className="text-muted-foreground">No tienes acceso a esta sección</p>
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-semibold text-foreground">Configuración</h1>
         <p className="text-muted-foreground">Administra categorías y usuarios del sistema</p>
       </div>
 
       <div className="grid gap-6 lg:grid-cols-2">
         {/* Categories Section */}
         <Card>
           <CardHeader>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Tags className="h-5 w-5 text-primary" />
                 <CardTitle>Categorías</CardTitle>
               </div>
               <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                 <DialogTrigger asChild>
                   <Button size="sm" onClick={() => handleOpenCategoryDialog()}>
                     <Plus className="mr-2 h-4 w-4" />
                     Nueva
                   </Button>
                 </DialogTrigger>
                 <DialogContent>
                   <DialogHeader>
                     <DialogTitle>
                       {selectedCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                     </DialogTitle>
                     <DialogDescription>
                       Las categorías te ayudan a organizar tus productos
                     </DialogDescription>
                   </DialogHeader>
                   
                   <div className="grid gap-4 py-4">
                     <div className="space-y-2">
                       <Label htmlFor="cat-name">Nombre *</Label>
                       <Input
                         id="cat-name"
                         value={categoryForm.name}
                         onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="cat-desc">Descripción</Label>
                       <Input
                         id="cat-desc"
                         value={categoryForm.description}
                         onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                       />
                     </div>
                   </div>
                   
                   <DialogFooter>
                     <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                       Cancelar
                     </Button>
                     <Button onClick={handleSaveCategory} disabled={saving}>
                       {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                       {selectedCategory ? 'Guardar' : 'Crear'}
                     </Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>
             </div>
             <CardDescription>Organiza tus productos por categorías</CardDescription>
           </CardHeader>
           <CardContent>
             {loading ? (
               <div className="flex items-center justify-center py-8">
                 <Loader2 className="h-6 w-6 animate-spin text-primary" />
               </div>
             ) : categories.length === 0 ? (
               <p className="text-center py-8 text-muted-foreground">
                 No hay categorías registradas
               </p>
             ) : (
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Nombre</TableHead>
                     <TableHead className="text-right">Acciones</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {categories.map((category) => (
                     <TableRow key={category.id}>
                       <TableCell>
                         <div>
                           <p className="font-medium">{category.name}</p>
                           {category.description && (
                             <p className="text-sm text-muted-foreground">{category.description}</p>
                           )}
                         </div>
                       </TableCell>
                       <TableCell className="text-right">
                         <div className="flex items-center justify-end gap-1">
                           <Button
                             variant="ghost"
                             size="icon"
                             onClick={() => handleOpenCategoryDialog(category)}
                           >
                             <Pencil className="h-4 w-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="icon"
                             onClick={() => {
                               setSelectedCategory(category);
                               setDeleteDialogOpen(true);
                             }}
                           >
                             <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
           </CardContent>
         </Card>
 
         {/* Users Section */}
         <Card>
           <CardHeader>
             <div className="flex items-center gap-2">
               <User className="h-5 w-5 text-primary" />
               <CardTitle>Usuarios</CardTitle>
             </div>
             <CardDescription>Gestiona los roles de los usuarios del sistema</CardDescription>
           </CardHeader>
           <CardContent>
             {loading ? (
               <div className="flex items-center justify-center py-8">
                 <Loader2 className="h-6 w-6 animate-spin text-primary" />
               </div>
             ) : users.length === 0 ? (
               <p className="text-center py-8 text-muted-foreground">
                 No hay usuarios registrados
               </p>
             ) : (
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Usuario</TableHead>
                     <TableHead>Rol</TableHead>
                     <TableHead className="text-right">Acción</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {users.map((user) => (
                     <TableRow key={user.id}>
                       <TableCell>
                         <div>
                           <p className="font-medium">{user.full_name}</p>
                           <p className="text-sm text-muted-foreground">{user.email}</p>
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                           {user.role === 'admin' && <ShieldCheck className="mr-1 h-3 w-3" />}
                           {user.role === 'admin' ? 'Admin' : 'Vendedor'}
                         </Badge>
                       </TableCell>
                       <TableCell className="text-right">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleToggleUserRole(user)}
                         >
                           Cambiar Rol
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
           </CardContent>
         </Card>
       </div>
 
       <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
             <AlertDialogDescription>
               Esta acción no se puede deshacer. Los productos de esta categoría quedarán sin categoría asignada.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancelar</AlertDialogCancel>
             <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
               Eliminar
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
 }