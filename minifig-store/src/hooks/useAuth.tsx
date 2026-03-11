import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { StoreUser } from '@/types';

interface AuthCtx {
    user: User | null;
    profile: StoreUser | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<StoreUser | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = async (uid: string) => {
        const { data } = await supabase
            .from('customers')
            .select('id, name, email, phone, user_id')
            .eq('user_id', uid)
            .single();
        if (data) {
            setProfile({
                id: data.id,
                email: data.email ?? '',
                full_name: (data as { name?: string | null }).name ?? null,
                phone: data.phone ?? null,
            });
        }
    };

    /**
     * Si el usuario se autenticó con Google y no tiene aún un registro en
     * 'customers', lo creamos automáticamente con su info de perfil de Google.
     */
    const ensureCustomerRecord = async (u: User) => {
        // Verificar si ya existe un registro
        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', u.id)
            .single();

        if (!existing) {
            const fullName = u.user_metadata?.full_name ?? u.user_metadata?.name ?? '';
            const email = u.email ?? '';
            await supabase.from('customers').insert({
                name: fullName,
                email: email,
                phone: null,
                user_id: u.id,
            });
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) loadProfile(session.user.id);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                // Si vino de OAuth (Google), garantizamos que exista su registro de cliente
                if (session.user.app_metadata?.provider === 'google') {
                    await ensureCustomerRecord(session.user);
                }
                loadProfile(session.user.id);
            } else {
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
