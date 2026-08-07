-- Stock ledger + product categories for conflict-safe inventory.

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT NOT NULL REFERENCES public.settings(branch_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_branch ON public.categories(branch_id);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  delta NUMERIC NOT NULL,
  qty_before NUMERIC NOT NULL DEFAULT 0,
  qty_after NUMERIC NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id TEXT,
  note TEXT,
  actor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product
  ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch
  ON public.stock_movements(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref
  ON public.stock_movements(reference_type, reference_id);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated sync categories" ON public.categories;
CREATE POLICY "Authenticated sync categories" ON public.categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated sync stock_movements" ON public.stock_movements;
CREATE POLICY "Authenticated sync stock_movements" ON public.stock_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
