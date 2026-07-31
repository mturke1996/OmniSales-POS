-- Cash drawer movements during an open shift

CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL DEFAULT '',
    cashier_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_shift ON public.cash_movements(shift_id);

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read cash_movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Authenticated write cash_movements" ON public.cash_movements;

CREATE POLICY "Authenticated read cash_movements" ON public.cash_movements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write cash_movements" ON public.cash_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
