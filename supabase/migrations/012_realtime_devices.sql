-- Realtime publication + device presence for multi-register OmniSales.

CREATE TABLE IF NOT EXISTS public.devices (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  cashier_id TEXT,
  cashier_name TEXT,
  runtime TEXT NOT NULL DEFAULT 'pwa',
  current_tab TEXT,
  status TEXT NOT NULL DEFAULT 'online',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_branch_seen
  ON public.devices(branch_id, last_seen_at DESC);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated sync devices" ON public.devices;
CREATE POLICY "Authenticated sync devices" ON public.devices
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;

-- Add POS tables to the realtime publication (safe if already added).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders',
    'products',
    'returns',
    'customers',
    'customer_ledger',
    'purchases',
    'stock_movements',
    'shifts',
    'expenses',
    'suppliers',
    'supplier_payments',
    'promotions',
    'categories',
    'devices',
    'cash_movements',
    'audit_log'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        t
      );
    EXCEPTION
      WHEN undefined_object THEN
        -- publication missing in non-Supabase Postgres — ignore
        NULL;
      WHEN duplicate_object THEN
        NULL;
    END;
  END LOOP;
END $$;
