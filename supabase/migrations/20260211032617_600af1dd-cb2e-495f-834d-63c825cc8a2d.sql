-- Allow admins to delete sales
CREATE POLICY "Admins can delete sales"
  ON public.sales FOR DELETE TO authenticated
  USING (is_admin());

-- Allow admins to update and delete sale_items  
CREATE POLICY "Admins can update sale items"
  ON public.sale_items FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete sale items"
  ON public.sale_items FOR DELETE TO authenticated
  USING (is_admin());
