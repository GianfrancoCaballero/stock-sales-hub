-- Tabla de ventas
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'efectivo',
  status text NOT NULL DEFAULT 'completada',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla de items de venta
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Politicas para sales
CREATE POLICY "Authenticated users can view sales"
  ON public.sales FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sales"
  ON public.sales FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update sales"
  ON public.sales FOR UPDATE TO authenticated
  USING (public.is_admin());

-- Politicas para sale_items
CREATE POLICY "Authenticated users can view sale items"
  ON public.sale_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sale items"
  ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (true);

-- Indices para mejor rendimiento
CREATE INDEX idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX idx_sales_user_id ON public.sales(user_id);
CREATE INDEX idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON public.sale_items(product_id);