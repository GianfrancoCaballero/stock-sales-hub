import { ShoppingCart, X, Plus, Minus, Trash2, MessageCircle } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatWhatsAppMessage } from '@/lib/utils';

interface CartDrawerProps {
    open: boolean;
    onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
    const { items, totalItems, totalPrice, removeItem, updateQuantity, clearCart } = useCart();
    const { profile } = useAuth();

    const handleWhatsApp = () => {
        if (items.length === 0) return;
        const url = formatWhatsAppMessage(
            items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
            profile?.full_name ?? undefined
        );
        window.open(url, '_blank');
    };

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 overlay-backdrop"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white z-50 shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-orange-500" />
                        <h2 className="font-semibold text-gray-900">Mi carrito</h2>
                        {totalItems > 0 && (
                            <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                {totalItems}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                            <ShoppingCart className="w-16 h-16 opacity-20" />
                            <p className="text-sm">Tu carrito está vacío</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.product_id} className="flex gap-3 animate-fade-in">
                                {/* Imagen */}
                                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <ShoppingCart className="w-6 h-6 text-gray-300" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                                    <p className="text-orange-500 font-semibold text-sm">{formatCurrency(item.price)}</p>

                                    {/* Quantity controls */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <button
                                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                            disabled={item.quantity >= item.stock_quantity}
                                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Subtotal + remove */}
                                <div className="flex flex-col items-end justify-between">
                                    <button
                                        onClick={() => removeItem(item.product_id)}
                                        className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(item.price * item.quantity)}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Total</span>
                            <span className="text-xl font-bold text-gray-900">{formatCurrency(totalPrice)}</span>
                        </div>

                        <button
                            onClick={handleWhatsApp}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                        >
                            <MessageCircle className="w-5 h-5" />
                            Pedir por WhatsApp
                        </button>

                        <button
                            onClick={() => { clearCart(); onClose(); }}
                            className="w-full py-2.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
                        >
                            Vaciar carrito
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
