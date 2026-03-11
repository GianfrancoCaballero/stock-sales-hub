import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { CartItem } from '@/types';

const CART_KEY = 'minifig_cart';

interface CartCtx {
    items: CartItem[];
    totalItems: number;
    totalPrice: number;
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (product_id: string) => void;
    updateQuantity: (product_id: string, quantity: number) => void;
    clearCart: () => void;
}

const CartContext = createContext<CartCtx>({
    items: [],
    totalItems: 0,
    totalPrice: 0,
    addItem: () => { },
    removeItem: () => { },
    updateQuantity: () => { },
    clearCart: () => { },
});

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>(() => {
        try {
            const raw = localStorage.getItem(CART_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
    }, [items]);

    const addItem = useCallback((newItem: Omit<CartItem, 'quantity'>) => {
        setItems(prev => {
            const existing = prev.find(i => i.product_id === newItem.product_id);
            if (existing) {
                const maxQty = newItem.stock_quantity;
                return prev.map(i =>
                    i.product_id === newItem.product_id
                        ? { ...i, quantity: Math.min(i.quantity + 1, maxQty) }
                        : i
                );
            }
            return [...prev, { ...newItem, quantity: 1 }];
        });
    }, []);

    const removeItem = useCallback((product_id: string) => {
        setItems(prev => prev.filter(i => i.product_id !== product_id));
    }, []);

    const updateQuantity = useCallback((product_id: string, quantity: number) => {
        if (quantity <= 0) {
            setItems(prev => prev.filter(i => i.product_id !== product_id));
            return;
        }
        setItems(prev =>
            prev.map(i =>
                i.product_id === product_id
                    ? { ...i, quantity: Math.min(quantity, i.stock_quantity) }
                    : i
            )
        );
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    const totalItems = items.reduce((s, i) => s + i.quantity, 0);
    const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

    return (
        <CartContext.Provider value={{ items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}
