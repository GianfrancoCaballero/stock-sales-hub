
-- Eliminar vista existente y recrearla
DROP VIEW IF EXISTS public.products_public;

CREATE VIEW public.products_public AS
SELECT 
  id,
  name,
  sku,
  description,
  category_id,
  sale_price,
  stock_quantity,
  min_stock,
  created_at,
  updated_at
FROM public.products;

-- =============================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =============================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS (drop existing and recreate)
-- =============================================

-- Categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL TO authenticated USING (is_admin());

-- Customers
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
CREATE POLICY "Authenticated users can view customers"
  ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage customers"
  ON public.customers FOR ALL TO authenticated USING (is_admin());

-- Products
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL TO authenticated USING (is_admin());

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL TO authenticated USING (is_admin());

-- User Roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR is_admin());
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated USING (is_admin());

-- Inventory Movements
DROP POLICY IF EXISTS "Authenticated users can view inventory movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Authenticated users can create inventory movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Admins can manage inventory movements" ON public.inventory_movements;
CREATE POLICY "Authenticated users can view inventory movements"
  ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create inventory movements"
  ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage inventory movements"
  ON public.inventory_movements FOR ALL TO authenticated USING (is_admin());

-- Sales
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
CREATE POLICY "Authenticated users can view sales"
  ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create sales"
  ON public.sales FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update sales"
  ON public.sales FOR UPDATE TO authenticated USING (is_admin());

-- Sale Items
DROP POLICY IF EXISTS "Authenticated users can view sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can create sale items" ON public.sale_items;
CREATE POLICY "Authenticated users can view sale items"
  ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create sale items"
  ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);
