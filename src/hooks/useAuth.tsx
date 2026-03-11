import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/** Roles posibles en la aplicación. */
type AppRole = 'admin' | 'vendedor';

/**
 * Forma del contexto de autenticación expuesto a los componentes.
 */
interface AuthContextType {
  /** Usuario autenticado de Supabase, o `null` si no hay sesión. */
  user: User | null;
  /** Sesión activa de Supabase, o `null` si no hay sesión. */
  session: Session | null;
  /** `true` mientras se carga la sesión inicial desde Supabase. */
  loading: boolean;
  /** Rol del usuario actual (`'admin'` | `'vendedor'`), o `null` si no hay sesión. */
  role: AppRole | null;
  /** Atajo booleano: `true` si `role === 'admin'`. */
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Proveedor de autenticación. Debe envolver toda la aplicación (o al menos las
 * rutas protegidas). Gestiona el estado de sesión, el rol del usuario y
 * suscribe a los cambios de autenticación de Supabase.
 *
 * @param {object} props
 * @param {ReactNode} props.children - Árbol de componentes hijos.
 *
 * @example
 * ```tsx
 * // En App.tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);

  /**
   * Consulta la tabla `user_roles` para obtener el rol del usuario.
   * Si no encuentra ningún rol, asigna `'vendedor'` como valor por defecto.
   *
   * @param {string} userId - UUID del usuario autenticado.
   * @returns {Promise<void>}
   */
  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (!error && data) {
      setRole(data.role as AppRole);
    } else {
      setRole('vendedor');
    }
  };

  useEffect(() => {
    // Suscripción a cambios de auth (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // setTimeout(0) evita bloquear el hilo de autenticación de Supabase
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    // Carga inicial de sesión persistida en localStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Inicia sesión con email y contraseña.
   *
   * @param {string} email - Email del usuario.
   * @param {string} password - Contraseña en texto plano.
   * @returns {Promise<{ error: Error | null }>} Objeto con `error` o `null` si fue exitoso.
   *
   * @example
   * ```tsx
   * const { signIn } = useAuth();
   * const { error } = await signIn('user@example.com', 'secret123');
   * if (error) console.error(error.message);
   * ```
   */
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  /**
   * Registra un nuevo usuario con email, contraseña y nombre completo.
   * Supabase enviará un email de confirmación. El trigger `handle_new_user`
   * crea automáticamente el perfil y asigna el rol `'vendedor'`.
   *
   * @param {string} email - Email del nuevo usuario.
   * @param {string} password - Contraseña (mínimo 6 caracteres, restricción de Supabase Auth).
   * @param {string} fullName - Nombre completo, se guarda en `profiles.full_name`.
   * @returns {Promise<{ error: Error | null }>} Objeto con `error` o `null` si fue exitoso.
   *
   * @example
   * ```tsx
   * const { signUp } = useAuth();
   * const { error } = await signUp('nuevo@example.com', 'abc123', 'Juan Pérez');
   * ```
   */
  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  /**
   * Cierra la sesión del usuario actual. Limpia el estado local de usuario,
   * sesión y rol, y elimina la sesión de Supabase en el servidor.
   *
   * @returns {Promise<void>}
   *
   * @example
   * ```tsx
   * const { signOut } = useAuth();
   * await signOut(); // Redirigir a /auth desde el componente
   * ```
   */
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const value = {
    user,
    session,
    loading,
    role,
    isAdmin: role === 'admin',
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para acceder al contexto de autenticación desde cualquier componente.
 * Debe usarse dentro de un `<AuthProvider>`.
 *
 * @returns {AuthContextType} Estado y métodos de autenticación.
 * @throws {Error} Si se usa fuera de un `<AuthProvider>`.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAdmin, signOut } = useAuth();
 *   return <p>Hola {user?.email}. Admin: {isAdmin ? 'sí' : 'no'}</p>;
 * }
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}