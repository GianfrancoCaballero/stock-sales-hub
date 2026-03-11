-- Add image_url column to products for e-commerce display
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url TEXT;
