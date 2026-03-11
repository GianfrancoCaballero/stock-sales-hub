import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

// ======================== DATA ========================
const POPULAR: ProductPreview[] = [
    { name: 'Denji', series: 'Anime · Chainsaw Man', price: 18, badge: 'HOT', emoji: '⛓️', stock: true },
    { name: 'Gojo Satoru', series: 'Anime · Jujutsu Kaisen', price: 20, badge: 'HOT', emoji: '🔵', stock: true },
    { name: 'Yuji Itadori w/ Sukuna', series: 'Anime · Jujutsu Kaisen', price: 22, badge: 'NEW', emoji: '👊', stock: true },
    { name: 'Power', series: 'Anime · Chainsaw Man', price: 18, badge: null, emoji: '🩸', stock: true },
    { name: 'Ángel', series: 'Anime · Chainsaw Man', price: 17, badge: 'AGOTADO', emoji: '😇', stock: false },
    { name: 'Aki Hayakawa', series: 'Anime · Chainsaw Man', price: 18, badge: null, emoji: '🗡️', stock: true },
    { name: 'Yuta Okkotsu', series: 'Anime · Jujutsu Kaisen', price: 20, badge: 'NEW', emoji: '🌸', stock: true },
    { name: 'Choso', series: 'Anime · Jujutsu Kaisen', price: 18, badge: null, emoji: '🩹', stock: true },
];

const NOVEDADES: ProductPreview[] = [
    { name: 'Yuta Okkotsu Joven', series: 'Anime · Jujutsu Kaisen', price: 15, badge: 'NEW', emoji: '👦', stock: true },
    { name: 'Yuki Tsukumo', series: 'Anime · Jujutsu Kaisen', price: 18, badge: 'NEW', emoji: '⭐', stock: true },
    { name: 'Atsuya Kusakabe', series: 'Anime · Jujutsu Kaisen', price: 17, badge: 'NEW', emoji: '🏫', stock: true },
    { name: 'Aki Hayakawa V2', series: 'Anime · Chainsaw Man', price: 19, badge: 'NEW', emoji: '🗡️', stock: true },
    { name: 'Mahito', series: 'Anime · Jujutsu Kaisen', price: 18, badge: 'NEW', emoji: '🫤', stock: true },
];

const CATEGORY_GRID = [
    { label: 'Legos', emoji: '🟡', count: 12, slug: 'legos' },
    { label: 'Anime', emoji: '🗡️', count: 28, slug: 'anime' },
    { label: 'Superhéroes', emoji: '🦸', count: 8, slug: 'superheroes' },
    { label: 'Star Wars', emoji: '⭐', count: 6, slug: 'star-wars' },
    { label: 'Películas', emoji: '🎬', count: 10, slug: 'peliculas' },
    { label: 'Accesorios', emoji: '🎒', count: 15, slug: 'accesorios' },
];

interface ProductPreview {
    name: string;
    series: string;
    price: number;
    badge: 'HOT' | 'NEW' | 'AGOTADO' | null;
    emoji: string;
    stock: boolean;
}

// ======================== BADGE COLORS ========================
const badgeStyle: Record<string, React.CSSProperties> = {
    HOT: { backgroundColor: '#EF4444', color: 'white' },
    NEW: { backgroundColor: '#22C55E', color: 'white' },
    AGOTADO: { backgroundColor: '#374151', color: 'white' },
};

// ======================== MINI PRODUCT CARD ========================
function MiniCard({ p }: { p: ProductPreview }) {
    return (
        <div
            className="product-card shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer"
            style={{ minWidth: 220, maxWidth: 220 }}
        >
            {/* Image zone */}
            <div className="relative h-40 bg-gray-50 flex items-center justify-center">
                <span className="text-5xl">{p.emoji}</span>
                {p.badge && (
                    <span
                        className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={badgeStyle[p.badge]}
                    >
                        {p.badge}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: '#F26522' }}>
                    {p.series}
                </p>
                <p className="font-syne font-semibold text-[15px] text-gray-900 leading-snug mb-2 truncate">
                    {p.name}
                </p>
                <div className="flex items-center justify-between">
                    <span className="font-syne font-bold text-[17px] text-gray-900">
                        S/ {p.price}
                    </span>
                    <button
                        disabled={!p.stock}
                        className="text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={p.stock
                            ? { backgroundColor: '#F26522', color: 'white' }
                            : { backgroundColor: '#E5E7EB', color: '#9CA3AF' }
                        }
                    >
                        {p.stock ? '🛒 Agregar' : 'Agotado'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ======================== CAROUSEL ========================
function Carousel({ items, id }: { items: ProductPreview[]; id: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const scroll = (dir: 'l' | 'r') =>
        ref.current?.scrollBy({ left: dir === 'r' ? 480 : -480, behavior: 'smooth' });

    return (
        <div className="relative group">
            {/* Left arrow */}
            <button
                onClick={() => scroll('l')}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:border-orange-400"
            >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>

            {/* Track */}
            <div
                id={id}
                ref={ref}
                className="flex gap-4 overflow-x-auto no-scrollbar carousel-track pb-2"
            >
                {items.map((p) => <MiniCard key={p.name} p={p} />)}
            </div>

            {/* Right arrow */}
            <button
                onClick={() => scroll('r')}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:border-orange-400"
            >
                <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
        </div>
    );
}

// ======================== HOME ========================
export default function Home() {
    const wa = `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER ?? '51949784120'}`;

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Navbar />

            {/* ===== HERO ===== */}
            <section
                className="relative overflow-hidden py-20 px-4"
                style={{
                    background: 'linear-gradient(135deg, #FFF7F2 0%, #FFFAF5 50%, #F0F9FF 100%)',
                }}
            >
                {/* Decorative blobs */}
                <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-30 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #F2652230, transparent 70%)' }} />
                <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-20 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #FF8C4240, transparent 70%)' }} />

                <div className="max-w-3xl mx-auto text-center relative z-10">
                    {/* Badge pill */}
                    <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium mb-6"
                        style={{ backgroundColor: '#FFF3EC', borderColor: '#F2652250', color: '#F26522' }}>
                        ✨ Colección 2026 disponible ahora
                    </div>

                    {/* H1 */}
                    <h1 className="hero-title text-gray-900 mb-5 animate-fade-up-delay1">
                        Las mejores{' '}
                        <span style={{ color: '#F26522' }}>minifiguras</span>
                        <br />para tu colección
                    </h1>

                    {/* Description */}
                    <p className="text-gray-500 text-lg max-w-xl mx-auto mb-10 animate-fade-up-delay2">
                        Explora nuestro catálogo y arma tu colección con los personajes más icónicos.
                        ¡Pide fácil por WhatsApp!
                    </p>

                    {/* CTA buttons */}
                    <div className="flex flex-wrap gap-3 justify-center mb-14 animate-fade-up-delay3">
                        <Link
                            to="/catalogo"
                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-105"
                            style={{ backgroundColor: '#F26522', boxShadow: '0 8px 24px -4px #F2652250' }}
                        >
                            Ver catálogo ↓
                        </Link>
                        <a
                            href="#novedades"
                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-gray-700 bg-white border border-gray-200 hover:border-orange-300 transition-colors"
                        >
                            Ver novedades →
                        </a>
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-wrap justify-center gap-8 animate-fade-up-delay4">
                        {[
                            { num: '44+', label: 'Productos' },
                            { num: '2+', label: 'Colecciones' },
                            { num: '★ 4.9', label: 'Valoración' },
                            { num: '500+', label: 'Clientes felices' },
                        ].map(({ num, label }) => (
                            <div key={label} className="text-center">
                                <p className="font-syne font-extrabold text-2xl text-gray-900">{num}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== MÁS POPULARES ===== */}
            <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <h2 className="font-syne font-bold text-2xl sm:text-3xl text-gray-900">
                                🔥 Más <span style={{ color: '#F26522' }}>Populares</span>
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">Los favoritos de nuestra comunidad</p>
                        </div>
                        <Link to="/catalogo" className="text-sm font-medium transition-colors flex items-center gap-1"
                            style={{ color: '#F26522' }}>
                            Ver todos <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <Carousel items={POPULAR} id="popular-carousel" />
                </div>
            </section>

            {/* ===== GRID DE CATEGORÍAS ===== */}
            <section className="py-16 px-4" style={{ backgroundColor: '#F5F5F5' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="font-syne font-bold text-2xl sm:text-3xl text-gray-900 mb-2">
                            Explora por <span style={{ color: '#F26522' }}>categoría</span>
                        </h2>
                        <p className="text-gray-400 text-sm">Encuentra exactamente lo que buscas</p>
                    </div>
                    <div
                        className="grid gap-4"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
                    >
                        {CATEGORY_GRID.map(({ label, emoji, count, slug }) => (
                            <Link
                                key={slug}
                                to={`/catalogo?cat=${slug}`}
                                className="cat-card bg-white border border-gray-100 rounded-2xl p-6 text-center flex flex-col items-center gap-3 no-underline"
                            >
                                <span className="text-3xl">{emoji}</span>
                                <div>
                                    <p className="font-syne font-semibold text-gray-900 text-[15px]">{label}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{count} productos</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== ÚLTIMAS NOVEDADES ===== */}
            <section id="novedades" className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <h2 className="font-syne font-bold text-2xl sm:text-3xl text-gray-900">
                                ✨ Últimas <span style={{ color: '#F26522' }}>Novedades</span>
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">Recién llegados a la tienda</p>
                        </div>
                        <Link to="/catalogo" className="text-sm font-medium flex items-center gap-1 transition-colors"
                            style={{ color: '#F26522' }}>
                            Ver todos <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <Carousel items={NOVEDADES} id="new-carousel" />
                </div>
            </section>

            {/* ===== BANNER PROMO ===== */}
            <section className="py-10 px-4">
                <div className="max-w-7xl mx-auto">
                    <div
                        className="relative overflow-hidden rounded-2xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6"
                        style={{ backgroundColor: '#1A1A2E' }}
                    >
                        {/* Orange glow */}
                        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10 pointer-events-none"
                            style={{ background: 'radial-gradient(circle, #F26522, transparent)' }} />

                        <div className="relative z-10">
                            <h3 className="font-syne font-bold text-2xl sm:text-3xl text-white mb-2">
                                ¿No encuentras tu <span style={{ color: '#F26522' }}>personaje favorito</span>?
                            </h3>
                            <p className="text-white/60 text-sm sm:text-base max-w-md">
                                Escríbenos por WhatsApp y lo buscamos por ti. Pedidos personalizados disponibles.
                            </p>
                        </div>

                        <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="relative z-10 shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-105"
                            style={{ backgroundColor: '#F26522', boxShadow: '0 8px 24px -4px #F2652250' }}
                        >
                            <MessageCircle className="w-5 h-5" />
                            💬 Pedir por WhatsApp
                        </a>

                        <span className="hidden sm:block text-7xl relative z-10">🧩</span>
                    </div>
                </div>
            </section>

            <Footer />

            {/* ===== WHATSAPP FLOATING BUTTON ===== */}
            <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 text-white font-semibold pl-4 pr-5 py-3 transition-all hover:-translate-y-0.5 active:scale-95"
                style={{
                    backgroundColor: '#25D366',
                    borderRadius: '50px',
                    boxShadow: '0 8px 24px -4px rgba(37,211,102,0.5)',
                }}
            >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">💬 Contáctanos</span>
            </a>
        </div>
    );
}
