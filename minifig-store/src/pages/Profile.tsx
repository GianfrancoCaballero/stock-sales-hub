import { useState, useEffect } from 'react';
import { User, Phone, Mail, Save, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
    const { user, profile, loading: authLoading, signOut } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '' });

    useEffect(() => {
        if (!authLoading && !user) navigate('/auth');
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (profile) {
            setForm({
                name: profile.full_name ?? '',
                phone: profile.phone ?? '',
                email: profile.email,
            });
        }
    }, [profile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);

        await supabase
            .from('customers')
            .update({ name: form.name, phone: form.phone })
            .eq('user_id', user.id);

        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <main className="flex-1 max-w-lg mx-auto w-full px-4 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">Mi perfil</h1>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Avatar header */}
                    <div className="bg-gradient-to-r from-orange-400 to-amber-400 p-8 text-center">
                        <div className="w-20 h-20 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-3xl font-extrabold text-white">
                                {form.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                        </div>
                        <p className="text-white font-semibold">{form.name || 'Tu nombre'}</p>
                        <p className="text-orange-100 text-sm">{form.email}</p>
                    </div>

                    <form onSubmit={handleSave} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <User className="inline w-4 h-4 mr-1" />Nombre completo
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-orange-400 bg-gray-50 focus:bg-white transition-colors"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <Mail className="inline w-4 h-4 mr-1" />Correo electrónico
                            </label>
                            <input
                                type="email"
                                value={form.email}
                                disabled
                                className="w-full px-4 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                <Phone className="inline w-4 h-4 mr-1" />Teléfono / WhatsApp
                            </label>
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                placeholder="+51 987 654 321"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-orange-400 bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>

                        {saved && (
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl text-sm border border-green-100">
                                <CheckCircle className="w-4 h-4" /> Perfil actualizado correctamente
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar cambios
                        </button>

                        <button
                            type="button"
                            onClick={async () => { await signOut(); navigate('/'); }}
                            className="w-full py-2.5 text-sm text-red-500 hover:text-red-700 transition-colors"
                        >
                            Cerrar sesión
                        </button>
                    </form>
                </div>
            </main>

            <Footer />
        </div>
    );
}
