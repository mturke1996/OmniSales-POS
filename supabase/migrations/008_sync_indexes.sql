-- Performance indexes for multi-device sync / pull queries

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_type ON public.orders (type);
CREATE INDEX IF NOT EXISTS idx_products_branch ON public.products (branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON public.purchases (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions (active);
CREATE INDEX IF NOT EXISTS idx_audit_log_at ON public.audit_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers (name);

-- Ensure Data API roles can access POS tables (Supabase exposure)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
