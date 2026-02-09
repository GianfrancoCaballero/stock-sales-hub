
-- Recrear la vista sin SECURITY DEFINER (usar SECURITY INVOKER por defecto)
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
  created_at,
  updated_at
FROM public.products;
