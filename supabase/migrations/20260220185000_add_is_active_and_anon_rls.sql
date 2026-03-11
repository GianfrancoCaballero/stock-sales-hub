-- =============================================
-- Add is_active column to products
-- =============================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Set all existing products as active by default
UPDATE public.products SET is_active = true WHERE is_active IS NULL;

-- Add is_active to products_public view
DROP VIEW IF EXISTS public.products_public;
CREATE VIEW public.products_public
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  sku,
  description,
  category_id,
  sale_price,
  stock_quantity,
  min_stock,
  is_active,
  created_at,
  updated_at
FROM public.products;

-- =============================================
-- Allow anonymous (public) read on products and categories
-- so the e-commerce store works without login
-- =============================================

-- Products: allow anon SELECT for active products
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  TO anon
  USING (is_active = true);

-- Categories: allow anon SELECT
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  TO anon
  USING (true);
