-- Harden sync RLS: revoke wide-open anon write from 006/008.
-- Device sync should use an authenticated role (or a dedicated sync user),
-- not a public anon key with FOR ALL USING (true).

-- Revoke blanket grants to anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Drop open device-sync policies
DROP POLICY IF EXISTS "Device sync settings" ON public.settings;
DROP POLICY IF EXISTS "Device sync products" ON public.products;
DROP POLICY IF EXISTS "Device sync customers" ON public.customers;
DROP POLICY IF EXISTS "Device sync ledger" ON public.customer_ledger;
DROP POLICY IF EXISTS "Device sync customer_ledger" ON public.customer_ledger;
DROP POLICY IF EXISTS "Device sync shifts" ON public.shifts;
DROP POLICY IF EXISTS "Device sync orders" ON public.orders;
DROP POLICY IF EXISTS "Device sync expenses" ON public.expenses;
DROP POLICY IF EXISTS "Device sync returns" ON public.returns;
DROP POLICY IF EXISTS "Device sync cash_movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Device sync suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Device sync purchases" ON public.purchases;
DROP POLICY IF EXISTS "Device sync promotions" ON public.promotions;
DROP POLICY IF EXISTS "Device sync audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Device sync return_items" ON public.return_items;

-- Authenticated sync only (service role bypasses RLS for server jobs)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'settings', 'products', 'customers', 'customer_ledger', 'shifts',
    'orders', 'expenses', 'returns', 'return_items', 'cash_movements',
    'suppliers', 'purchases', 'promotions', 'audit_log'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "Authenticated sync %1$s" ON public.%1$s',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Authenticated sync %1$s" ON public.%1$s
         FOR ALL TO authenticated
         USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
