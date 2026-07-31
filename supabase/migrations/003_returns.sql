-- Returns / reverse logistics for OmniSales POS
-- Apply only on a dedicated OmniSales Supabase project with 001 schema.

CREATE TABLE IF NOT EXISTS public.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number TEXT NOT NULL,
    order_id UUID NOT NULL,
    order_number TEXT NOT NULL,
    shift_id UUID,
    refund_method TEXT NOT NULL CHECK (refund_method IN ('cash', 'card', 'credit')),
    total_refund NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    cashier_id TEXT,
    customer_id UUID,
    customer_name TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_order_id ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON public.returns(created_at DESC);

CREATE TABLE IF NOT EXISTS public.return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
    product_id UUID,
    name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit_refund NUMERIC NOT NULL DEFAULT 0,
    restock BOOLEAN NOT NULL DEFAULT true,
    line_index INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON public.return_items(return_id);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read returns" ON public.returns
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write returns" ON public.returns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read return_items" ON public.return_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write return_items" ON public.return_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
