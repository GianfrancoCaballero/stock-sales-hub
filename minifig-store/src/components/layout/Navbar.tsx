import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Search, User, LogOut, Package } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { CartDrawer } from '../CartDrawer';

const CATEGORIES_NAV = [
    { label: '🧱 Todos', slug: '' },
    { label: '🟡 Legos', slug: 'legos' },
    { label: '🗡️ Anime', slug: 'anime' },
    { label: '🦸 Superhéroes', slug: 'superheroes' },
    { label: '🎮 Videojuegos', slug: 'videojuegos' },
    { label: '🎬 Películas', slug: 'peliculas' },
    { label: '⭐ Star Wars', slug: 'star-wars' },
    { label: '🎒 Accesorios', slug: 'accesorios' },
    { label: '🎁 Sets', slug: 'sets' },
    { label: '🔥 Ofertas', slug: 'ofertas' },
];

interface NavbarProps {
    searchTerm?: string;
    onSearch?: (term: string) => void;
    /** Slug de categoría activa (solo en /catalogo) */
    activeCategory?: string;
    onCategoryChange?: (slug: string) => void;
    /** Si se debe mostrar la barra de categorías */
    showCategories?: boolean;
}

export function Navbar({
    searchTerm = '',
    onSearch,
    activeCategory = '',
    onCategoryChange,
    showCategories = false,
}: NavbarProps) {
    const { totalItems } = useCart();
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [cartOpen, setCartOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        setUserMenuOpen(false);
        navigate('/');
    };

    const isOnCatalog = location.pathname === '/catalogo';

    return (
        <>
            {/* ===== TOPBAR ===== */}
            <div
                style={{ backgroundColor: '#1A1A2E' }}
                className="text-white text-center py-2 px-4 text-[13px] leading-5"
            >
                ✨ Envíos gratis en pedidos mayores a{' '}
                <span style={{ color: '#F26522' }} className="font-semibold">S/ 80</span>
                {' '}· ¡Pide por WhatsApp!
            </div>

            {/* ===== HEADER STICKY ===== */}
            <header
                className="sticky top-0 z-40 border-b border-gray-100"
                style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.92)' }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16 gap-4">

                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2 shrink-0">
                            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-syne font-bold text-gray-900 text-lg hidden sm:block">
                                Minifig<span style={{ color: '#F26522' }}>Store</span>
                            </span>
                        </Link>

                        {/* Search bar (desktop) */}
                        <div className="hidden sm:flex flex-1 max-w-md">
                            <div className="relative w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Buscar minifiguras..."
                                    value={searchTerm}
                                    onChange={(e) => onSearch?.(e.target.value)}
                                    onFocus={() => {
                                        if (!isOnCatalog) navigate('/catalogo');
                                    }}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-100 border border-transparent rounded-[50px] focus:bg-white focus:border-orange-400 focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {/* Catalog CTA (only on landing) */}
                            {!isOnCatalog && (
                                <Link
                                    to="/catalogo"
                                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:border-orange-400 hover:text-orange-500 transition-colors"
                                >
                                    Ver catálogo
                                </Link>
                            )}

                            {/* Cart */}
                            <button
                                onClick={() => setCartOpen(true)}
                                className="relative p-2 rounded-xl hover:bg-orange-50 transition-colors group"
                                aria-label="Carrito"
                            >
                                <ShoppingCart className="w-5 h-5 text-gray-600 group-hover:text-orange-500 transition-colors" />
                                {totalItems > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center cart-badge">
                                        {totalItems > 9 ? '9+' : totalItems}
                                    </span>
                                )}
                            </button>

                            {/* User */}
                            {user ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                            <span className="text-orange-600 text-sm font-semibold">
                                                {profile?.full_name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                                            {profile?.full_name ?? user.email}
                                        </span>
                                    </button>

                                    {userMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 animate-fade-in">
                                                <Link to="/perfil" onClick={() => setUserMenuOpen(false)}
                                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                                    <User className="w-4 h-4" /> Mi perfil
                                                </Link>
                                                <hr className="my-1 border-gray-100" />
                                                <button onClick={handleSignOut}
                                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 w-full">
                                                    <LogOut className="w-4 h-4" /> Cerrar sesión
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    to="/auth"
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors"
                                    style={{ backgroundColor: '#F26522' }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#d9571d')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#F26522')}
                                >
                                    <User className="w-4 h-4" />
                                    <span className="hidden sm:block">Iniciar sesión</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== CATEGORIES NAV ===== */}
                {showCategories && (
                    <div
                        className="border-t border-gray-100"
                        style={{ backgroundColor: 'rgba(255,255,255,0.96)' }}
                    >
                        <div className="max-w-7xl mx-auto px-4 sm:px-6">
                            <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
                                {CATEGORIES_NAV.map(({ label, slug }) => {
                                    const isActive = activeCategory === slug;
                                    return (
                                        <button
                                            key={slug}
                                            onClick={() => onCategoryChange?.(slug)}
                                            className="shrink-0 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative"
                                            style={{
                                                color: isActive ? '#F26522' : '#6B7280',
                                                borderBottom: isActive ? '2px solid #F26522' : '2px solid transparent',
                                            }}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
        </>
    );
}
