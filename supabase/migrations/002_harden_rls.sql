-- Harden OmniSales POS RLS: revoke anon-open policies from 001.
-- Require authenticated users for reads/writes. Apply only to a dedicated
-- OmniSales Supabase project that uses the POS schema from 001_initial_schema.sql.

DROP POLICY IF EXISTS "Allow anon read all" ON public.settings;
DROP POLICY IF EXISTS "Allow anon read all" ON public.products;
DROP POLICY IF EXISTS "Allow anon read all" ON public.customers;
DROP POLICY IF EXISTS "Allow anon read all" ON public.customer_ledger;
DROP POLICY IF EXISTS "Allow anon read all" ON public.shifts;
DROP POLICY IF EXISTS "Allow anon read all" ON public.orders;
DROP POLICY IF EXISTS "Allow anon read all" ON public.expenses;

DROP POLICY IF EXISTS "Allow anon insert all" ON public.products;
DROP POLICY IF EXISTS "Allow anon update all" ON public.products;
DROP POLICY IF EXISTS "Allow anon insert all" ON public.customers;
DROP POLICY IF EXISTS "Allow anon update all" ON public.customers;
DROP POLICY IF EXISTS "Allow anon insert all" ON public.orders;
DROP POLICY IF EXISTS "Allow anon insert all" ON public.shifts;
DROP POLICY IF EXISTS "Allow anon update all" ON public.shifts;
DROP POLICY IF EXISTS "Allow anon insert all" ON public.expenses;

-- Authenticated full access (single-tenant branch apps). Tighten further with
-- branch_id claims when multi-tenant auth is introduced.
CREATE POLICY "Authenticated read settings" ON public.settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write settings" ON public.settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read products" ON public.products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write products" ON public.products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read customers" ON public.customers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write customers" ON public.customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read ledger" ON public.customer_ledger
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write ledger" ON public.customer_ledger
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read shifts" ON public.shifts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write shifts" ON public.shifts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read orders" ON public.orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write orders" ON public.orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read expenses" ON public.expenses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write expenses" ON public.expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
