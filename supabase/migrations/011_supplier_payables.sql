-- Supplier payables: balance on suppliers + payment ledger.

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS balance NUMERIC NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  note TEXT,
  purchase_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier
  ON public.supplier_payments(supplier_id, created_at DESC);

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';

ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated sync supplier_payments" ON public.supplier_payments;
CREATE POLICY "Authenticated sync supplier_payments" ON public.supplier_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_payments TO authenticated;
