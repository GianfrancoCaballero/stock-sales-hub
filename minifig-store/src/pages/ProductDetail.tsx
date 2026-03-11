import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Package, MessageCircle, Plus, Minus, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/hooks/useCart';
import { formatCurrency, formatWhatsAppMessage } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import type { Product } from '@/types';

export default function ProductDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addItem } = useCart();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        if (!id) return;
        supabase
            .from('products')
            .select('*, category:categories(id, name)')
            .eq('id', id)
            .eq('is_active', true)
            .single()
            .then(({ data }) => {
                setProduct(data as Product | null);
                setLoading(false);
            });
    }, [id]);

    const handleAdd = () => {
        if (!product) return;
        for (let i = 0; i < qty; i++) {
            addItem({
                product_id: product.id,
                name: product.name,
                price: product.sale_price,
                image_url: product.image_url,
                stock_quantity: product.stock_quantity,
            });
        }
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    const handleBuyWhatsApp = () => {
        if (!product) return;
        const url = formatWhatsAppMessage([
            { name: product.name, quantity: qty, price: product.sale_price }
        ]);
        window.open(url, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-400" />
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
                    <p className="text-5xl">😕</p>
                    <p className="text-lg font-medium">Producto no encontrado</p>
                    <button onClick={() => navigate('/')} className="text-orange-500 underline text-sm">
                        Volver al catálogo
                    </button>
                </div>
            </div>
        );
    }

    const outOfStock = product.stock_quantity <= 0;
    const maxQty = Math.min(product.stock_quantity, 10);

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
                {/* Breadcrumb */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
                    {/* Image */}
                    <div className="aspect-square rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                        {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            <Package className="w-24 h-24 text-gray-200" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col">
                        {product.category && (
                            <span className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-2">
                                {product.category.name}
                            </span>
                        )}

                        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">{product.name}</h1>

                        {product.sku && (
                            <p className="text-xs text-gray-400 mt-1">SKU: {product.sku}</p>
                        )}

                        <p className="text-4xl font-bold text-gray-900 mt-6">{formatCurrency(product.sale_price)}</p>

                        {/* Stock */}
                        {outOfStock ? (
                            <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-500 font-medium">
                                ❌ Sin stock disponible
                            </span>
                        ) : (
                            <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                                <Check className="w-4 h-4" />
                                {product.stock_quantity} disponibles
                            </span>
                        )}

                        {product.description && (
                            <p className="text-gray-500 mt-6 leading-relaxed text-sm">{product.description}</p>
                        )}

                        {/* Quantity */}
                        {!outOfStock && (
                            <div className="flex items-center gap-3 mt-8">
                                <span className="text-sm font-medium text-gray-700">Cantidad:</span>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                                    <button
                                        onClick={() => setQty(q => Math.max(1, q - 1))}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-semibold text-gray-900">{qty}</span>
                                    <button
                                        onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-8">
                            <button
                                onClick={handleAdd}
                                disabled={outOfStock}
                                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all ${outOfStock
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : added
                                            ? 'bg-green-500 text-white'
                                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                                    }`}
                            >
                                {added ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                                {added ? '¡Agregado al carrito!' : 'Agregar al carrito'}
                            </button>

                            <button
                                onClick={handleBuyWhatsApp}
                                disabled={outOfStock}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white transition-colors"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Pedir por WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
