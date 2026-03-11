export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  sale_price: number;
  stock_quantity: number;
  is_active: boolean;
  category_id: string | null;
  image_url: string | null;
  category?: { id: string; name: string } | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  stock_quantity: number;
}

export interface StoreUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
}
