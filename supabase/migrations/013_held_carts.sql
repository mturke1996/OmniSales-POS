-- Held carts as first-class multi-register reservations.

CREATE TABLE IF NOT EXISTS public.held_carts (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  device_id TEXT,
  cashier_id TEXT,
  cashier_name TEXT,
  customer_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'held',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_held_carts_branch_status
  ON public.held_carts(branch_id, status, updated_at DESC);

ALTER TABLE public.held_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Device sync held_carts" ON public.held_carts;
CREATE POLICY "Device sync held_carts" ON public.held_carts
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.held_carts TO anon, authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.held_carts;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
