import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Package } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const { addItem } = useCart();
    const [added, setAdded] = useState(false);

    const outOfStock = product.stock_quantity <= 0;

    const handleAdd = (e: React.MouseEvent) => {
        e.preventDefault();
        if (outOfStock) return;
        addItem({
            product_id: product.id,
            name: product.name,
            price: product.sale_price,
            image_url: product.image_url,
            stock_quantity: product.stock_quantity,
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    };

    return (
        <Link to={`/producto/${product.id}`} className="group block">
            <div className="product-card bg-white rounded-2xl overflow-hidden border border-gray-100">
                {/* Image */}
                <div className="relative aspect-square bg-gray-50 overflow-hidden">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-16 h-16 text-gray-200" />
                        </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {outOfStock && (
                            <span className="bg-gray-800 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                                Agotado
                            </span>
                        )}
                    </div>

                    {/* View detail on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-800 px-3 py-1.5 rounded-full shadow-sm">
                            <Eye className="w-3.5 h-3.5" />
                            Ver detalle
                        </span>
                    </div>
                </div>

                {/* Info */}
                <div className="p-4">
                    {product.category && (
                        <span className="text-xs text-orange-500 font-medium uppercase tracking-wide">
                            {product.category.name}
                        </span>
                    )}
                    <h3 className="font-semibold text-gray-900 mt-0.5 text-sm leading-snug line-clamp-2">
                        {product.name}
                    </h3>

                    <div className="flex items-center justify-between mt-3">
                        <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(product.sale_price)}
                        </span>

                        <button
                            onClick={handleAdd}
                            disabled={outOfStock}
                            className={`
                flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all
                ${outOfStock
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : added
                                        ? 'bg-green-500 text-white scale-95'
                                        : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
                                }
              `}
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {added ? '¡Agregado!' : 'Agregar'}
                        </button>
                    </div>
                </div>
            </div>
        </Link>
    );
}
