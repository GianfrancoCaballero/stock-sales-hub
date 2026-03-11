import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/ProductCard';
import { MessageCircle, Loader2 } from 'lucide-react';
import type { Product, Category } from '@/types';

/** Map from slug → partial category name (case-insensitive contains) */
const SLUG_TO_CAT: Record<string, string> = {
    legos: 'lego',
    anime: 'anime',
    superheroes: 'super',
    'star-wars': 'star',
    peliculas: 'pelicula',
    accesorios: 'accesorio',
    sets: 'set',
    ofertas: 'oferta',
    videojuegos: 'videojuego',
};

export default function Catalog() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSlug, setActiveSlug] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const initialLoad = useRef(true);

    const wa = `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER ?? '51949784120'}`;

    // Sync activeSlug from URL ?cat= on first load
    useEffect(() => {
        if (initialLoad.current) {
            const cat = searchParams.get('cat') ?? '';
            setActiveSlug(cat);
            initialLoad.current = false;
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [{ data: prods }, { data: cats }] = await Promise.all([
                supabase
                    .from('products')
                    .select('*, category:categories(id, name)')
                    .eq('is_active', true)
                    .order('name'),
                supabase.from('categories').select('*').order('name'),
            ]);
            setProducts((prods as unknown as Product[]) || []);
            setCategories((cats as Category[]) || []);
            setLoading(false);
        };
        fetchData();
    }, []);

    // Resolve active slug → category id
    const activeCategoryId = (() => {
        if (!activeSlug) return null;
        const keyword = SLUG_TO_CAT[activeSlug] ?? activeSlug;
        const found = categories.find(c =>
            c.name.toLowerCase().includes(keyword.toLowerCase())
        );
        return found?.id ?? null;
    })();

    const filtered = products.filter(p => {
        const matchSearch =
            !searchTerm ||
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = !activeCategoryId || p.category_id === activeCategoryId;
        return matchSearch && matchCat;
    });

    const handleCategoryChange = (slug: string) => {
        setActiveSlug(slug);
        if (slug) {
            setSearchParams({ cat: slug });
        } else {
            setSearchParams({});
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Navbar
                searchTerm={searchTerm}
                onSearch={setSearchTerm}
                activeCategory={activeSlug}
                onCategoryChange={handleCategoryChange}
                showCategories
            />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="font-syne font-bold text-2xl sm:text-3xl text-gray-900 mb-1">
                        {activeSlug
                            ? `Categoría: ${activeSlug.charAt(0).toUpperCase() + activeSlug.slice(1)}`
                            : 'Catálogo completo'}
                    </h1>
                    {!loading && (
                        <p className="text-sm text-gray-400">
                            {filtered.length === 0
                                ? 'No se encontraron productos'
                                : `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} disponible${filtered.length !== 1 ? 's' : ''}`}
                        </p>
                    )}
                </div>

                {/* Category chips (DB categories) */}
                <div className="flex gap-2 flex-wrap mb-8">
                    <button
                        onClick={() => handleCategoryChange('')}
                        className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                        style={!activeSlug
                            ? { backgroundColor: '#F26522', color: 'white', borderColor: '#F26522' }
                            : { backgroundColor: 'white', color: '#6B7280', borderColor: '#E5E7EB' }
                        }
                    >
                        Todos
                    </button>
                    {categories.map(cat => {
                        const slug = Object.entries(SLUG_TO_CAT).find(([, kw]) =>
                            cat.name.toLowerCase().includes(kw)
                        )?.[0] ?? cat.name.toLowerCase();
                        const isActive = activeSlug === slug;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryChange(slug)}
                                className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                                style={isActive
                                    ? { backgroundColor: '#F26522', color: 'white', borderColor: '#F26522' }
                                    : { backgroundColor: 'white', color: '#6B7280', borderColor: '#E5E7EB' }
                                }
                            >
                                {cat.name}
                            </button>
                        );
                    })}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 text-gray-400">
                        <p className="text-5xl mb-4">📦</p>
                        <p className="font-medium text-lg">No hay productos disponibles</p>
                        {(searchTerm || activeSlug) && (
                            <button
                                onClick={() => { setSearchTerm(''); handleCategoryChange(''); }}
                                className="mt-4 text-sm hover:underline"
                                style={{ color: '#F26522' }}
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 animate-fade-in">
                        {filtered.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                )}
            </main>

            <Footer />

            {/* WhatsApp floating */}
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
