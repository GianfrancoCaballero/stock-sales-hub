import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Package, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

// Google icon SVG (same as dashboard)
const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

export default function Auth() {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
    });

    const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
        setError('');
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/`,
            },
        });
        if (error) {
            setError('No se pudo iniciar sesión con Google. Intenta de nuevo.');
            setGoogleLoading(false);
        }
        // Si no hay error, Supabase redirige al usuario a Google — no hay que hacer más nada aquí.
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email: form.email,
                    password: form.password,
                });
                if (error) throw error;
                navigate('/');
            } else {
                // Register
                const { data, error } = await supabase.auth.signUp({
                    email: form.email,
                    password: form.password,
                    options: {
                        data: { full_name: form.name, phone: form.phone },
                    },
                });
                if (error) throw error;

                // Crear registro en customers para que aparezca en el dashboard
                if (data.user) {
                    await supabase.from('customers').insert({
                        name: form.name,
                        email: form.email,
                        phone: form.phone || null,
                        user_id: data.user.id,
                    });
                }

                navigate('/');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Ocurrió un error';
            setError(
                msg.includes('Invalid login') ? 'Correo o contraseña incorrectos' :
                    msg.includes('already registered') ? 'Este correo ya está registrado' :
                        msg
            );
        } finally {
            setLoading(false);
        }
    };

    // Separator component reutilizable
    const Divider = () => (
        <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-400 tracking-wider">o continúa con</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-md">
                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white text-center">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <Package className="w-8 h-8" />
                            </div>
                            <h1 className="text-2xl font-bold">MinifigStore</h1>
                            <p className="text-orange-100 text-sm mt-1">
                                {mode === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta gratis'}
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b">
                            {(['login', 'register'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => { setMode(t); setError(''); }}
                                    className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${mode === t
                                        ? 'text-orange-500 border-b-2 border-orange-500'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                                </button>
                            ))}
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {mode === 'register' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Nombre completo *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.name}
                                        onChange={update('name')}
                                        placeholder="Juan Pérez"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Correo electrónico *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={update('email')}
                                    placeholder="tu@email.com"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white outline-none"
                                />
                            </div>

                            {mode === 'register' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Teléfono / WhatsApp
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={update('phone')}
                                        placeholder="+51 987 654 321"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Contraseña *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        value={form.password}
                                        onChange={update('password')}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:border-orange-400 transition-colors bg-gray-50 focus:bg-white outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || googleLoading}
                                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                            </button>

                            {/* Divider */}
                            <Divider />

                            {/* Google button */}
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={googleLoading || loading}
                                className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-3"
                            >
                                {googleLoading
                                    ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                    : <GoogleIcon />
                                }
                                Continuar con Google
                            </button>

                            {mode === 'login' && (
                                <p className="text-center text-sm text-gray-500">
                                    ¿No tienes cuenta?{' '}
                                    <button type="button" onClick={() => setMode('register')} className="text-orange-500 font-medium hover:underline">
                                        Regístrate gratis
                                    </button>
                                </p>
                            )}
                        </form>
                    </div>

                    <p className="text-center text-xs text-gray-400 mt-6">
                        Al registrarte, aceptas nuestros términos y política de privacidad.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
