 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { useAuth } from '@/hooks/useAuth';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { useToast } from '@/hooks/use-toast';
 import { Package, Loader2 } from 'lucide-react';
 import { z } from 'zod';
 
 const emailSchema = z.string().email('Por favor ingresa un email válido');
 const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');
 const nameSchema = z.string().min(2, 'El nombre debe tener al menos 2 caracteres');
 
 export default function Auth() {
   const [isLoading, setIsLoading] = useState(false);
   const [loginEmail, setLoginEmail] = useState('');
   const [loginPassword, setLoginPassword] = useState('');
   const [signupEmail, setSignupEmail] = useState('');
   const [signupPassword, setSignupPassword] = useState('');
   const [signupName, setSignupName] = useState('');
   const [errors, setErrors] = useState<Record<string, string>>({});
   
   const { signIn, signUp } = useAuth();
   const { toast } = useToast();
   const navigate = useNavigate();
 
   const validateField = (field: string, value: string) => {
     try {
       if (field.includes('email')) {
         emailSchema.parse(value);
       } else if (field.includes('password')) {
         passwordSchema.parse(value);
       } else if (field.includes('name')) {
         nameSchema.parse(value);
       }
       setErrors(prev => ({ ...prev, [field]: '' }));
       return true;
     } catch (error) {
       if (error instanceof z.ZodError) {
         setErrors(prev => ({ ...prev, [field]: error.errors[0].message }));
       }
       return false;
     }
   };
 
   const handleLogin = async (e: React.FormEvent) => {
     e.preventDefault();
     
     const emailValid = validateField('loginEmail', loginEmail);
     const passwordValid = validateField('loginPassword', loginPassword);
     
     if (!emailValid || !passwordValid) return;
     
     setIsLoading(true);
     const { error } = await signIn(loginEmail, loginPassword);
     setIsLoading(false);
     
     if (error) {
       let message = 'Error al iniciar sesión';
       if (error.message.includes('Invalid login credentials')) {
         message = 'Email o contraseña incorrectos';
       } else if (error.message.includes('Email not confirmed')) {
         message = 'Por favor confirma tu email antes de iniciar sesión';
       }
       toast({
         title: 'Error',
         description: message,
         variant: 'destructive',
       });
     } else {
       navigate('/');
     }
   };
 
   const handleSignup = async (e: React.FormEvent) => {
     e.preventDefault();
     
     const nameValid = validateField('signupName', signupName);
     const emailValid = validateField('signupEmail', signupEmail);
     const passwordValid = validateField('signupPassword', signupPassword);
     
     if (!nameValid || !emailValid || !passwordValid) return;
     
     setIsLoading(true);
     const { error } = await signUp(signupEmail, signupPassword, signupName);
     setIsLoading(false);
     
     if (error) {
       let message = 'Error al registrarse';
       if (error.message.includes('already registered')) {
         message = 'Este email ya está registrado';
       }
       toast({
         title: 'Error',
         description: message,
         variant: 'destructive',
       });
     } else {
       toast({
         title: 'Cuenta creada',
         description: 'Revisa tu email para confirmar tu cuenta',
       });
     }
   };
 
   return (
     <div className="min-h-screen bg-background flex items-center justify-center p-4">
       <div className="w-full max-w-md">
         <div className="flex items-center justify-center mb-8">
           <div className="flex items-center gap-3">
             <div className="bg-primary p-2 rounded-lg">
               <Package className="h-6 w-6 text-primary-foreground" />
             </div>
             <span className="text-2xl font-semibold text-foreground">Inventario</span>
           </div>
         </div>
         
         <Card className="border-border shadow-lg">
           <CardHeader className="space-y-1 pb-4">
             <CardTitle className="text-2xl text-center">Bienvenido</CardTitle>
             <CardDescription className="text-center">
               Inicia sesión o crea una cuenta para continuar
             </CardDescription>
           </CardHeader>
           <CardContent>
             <Tabs defaultValue="login" className="w-full">
               <TabsList className="grid w-full grid-cols-2 mb-6">
                 <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                 <TabsTrigger value="signup">Registrarse</TabsTrigger>
               </TabsList>
               
               <TabsContent value="login">
                 <form onSubmit={handleLogin} className="space-y-4">
                   <div className="space-y-2">
                     <Label htmlFor="login-email">Email</Label>
                     <Input
                       id="login-email"
                       type="email"
                       placeholder="tu@email.com"
                       value={loginEmail}
                       onChange={(e) => setLoginEmail(e.target.value)}
                       onBlur={() => validateField('loginEmail', loginEmail)}
                       disabled={isLoading}
                     />
                     {errors.loginEmail && (
                       <p className="text-sm text-destructive">{errors.loginEmail}</p>
                     )}
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="login-password">Contraseña</Label>
                     <Input
                       id="login-password"
                       type="password"
                       placeholder="••••••••"
                       value={loginPassword}
                       onChange={(e) => setLoginPassword(e.target.value)}
                       onBlur={() => validateField('loginPassword', loginPassword)}
                       disabled={isLoading}
                     />
                     {errors.loginPassword && (
                       <p className="text-sm text-destructive">{errors.loginPassword}</p>
                     )}
                   </div>
                   <Button type="submit" className="w-full" disabled={isLoading}>
                     {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Iniciar Sesión
                   </Button>
                 </form>
               </TabsContent>
               
               <TabsContent value="signup">
                 <form onSubmit={handleSignup} className="space-y-4">
                   <div className="space-y-2">
                     <Label htmlFor="signup-name">Nombre completo</Label>
                     <Input
                       id="signup-name"
                       type="text"
                       placeholder="Juan Pérez"
                       value={signupName}
                       onChange={(e) => setSignupName(e.target.value)}
                       onBlur={() => validateField('signupName', signupName)}
                       disabled={isLoading}
                     />
                     {errors.signupName && (
                       <p className="text-sm text-destructive">{errors.signupName}</p>
                     )}
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="signup-email">Email</Label>
                     <Input
                       id="signup-email"
                       type="email"
                       placeholder="tu@email.com"
                       value={signupEmail}
                       onChange={(e) => setSignupEmail(e.target.value)}
                       onBlur={() => validateField('signupEmail', signupEmail)}
                       disabled={isLoading}
                     />
                     {errors.signupEmail && (
                       <p className="text-sm text-destructive">{errors.signupEmail}</p>
                     )}
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="signup-password">Contraseña</Label>
                     <Input
                       id="signup-password"
                       type="password"
                       placeholder="••••••••"
                       value={signupPassword}
                       onChange={(e) => setSignupPassword(e.target.value)}
                       onBlur={() => validateField('signupPassword', signupPassword)}
                       disabled={isLoading}
                     />
                     {errors.signupPassword && (
                       <p className="text-sm text-destructive">{errors.signupPassword}</p>
                     )}
                   </div>
                   <Button type="submit" className="w-full" disabled={isLoading}>
                     {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Crear Cuenta
                   </Button>
                 </form>
               </TabsContent>
             </Tabs>
           </CardContent>
         </Card>
       </div>
     </div>
   );
 }