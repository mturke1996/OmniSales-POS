-- Unify RLS for dedicated OmniSales POS projects.
-- Device sync uses the project's anon key (single-tenant private project).
-- Authenticated policies remain for future email login.

-- Drop loose anon policies introduced in 005
DROP POLICY IF EXISTS "Allow anon all suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow anon all purchases" ON public.purchases;
DROP POLICY IF EXISTS "Allow anon all promotions" ON public.promotions;
DROP POLICY IF EXISTS "Allow anon all audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Allow anon update orders" ON public.orders;

-- Helper: recreate device + auth policies for a table
-- settings
DROP POLICY IF EXISTS "Device sync settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated write settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated read settings" ON public.settings;
CREATE POLICY "Device sync settings" ON public.settings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- products
DROP POLICY IF EXISTS "Device sync products" ON public.products;
DROP POLICY IF EXISTS "Authenticated write products" ON public.products;
DROP POLICY IF EXISTS "Authenticated read products" ON public.products;
CREATE POLICY "Device sync products" ON public.products
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- customers
DROP POLICY IF EXISTS "Device sync customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated write customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated read customers" ON public.customers;
CREATE POLICY "Device sync customers" ON public.customers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- customer_ledger
DROP POLICY IF EXISTS "Device sync ledger" ON public.customer_ledger;
DROP POLICY IF EXISTS "Authenticated write ledger" ON public.customer_ledger;
DROP POLICY IF EXISTS "Authenticated read ledger" ON public.customer_ledger;
CREATE POLICY "Device sync ledger" ON public.customer_ledger
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- shifts
DROP POLICY IF EXISTS "Device sync shifts" ON public.shifts;
DROP POLICY IF EXISTS "Authenticated write shifts" ON public.shifts;
DROP POLICY IF EXISTS "Authenticated read shifts" ON public.shifts;
CREATE POLICY "Device sync shifts" ON public.shifts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- orders
DROP POLICY IF EXISTS "Device sync orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated write orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated read orders" ON public.orders;
CREATE POLICY "Device sync orders" ON public.orders
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- expenses
DROP POLICY IF EXISTS "Device sync expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated write expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated read expenses" ON public.expenses;
CREATE POLICY "Device sync expenses" ON public.expenses
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- returns
DROP POLICY IF EXISTS "Device sync returns" ON public.returns;
DROP POLICY IF EXISTS "Authenticated write returns" ON public.returns;
DROP POLICY IF EXISTS "Authenticated read returns" ON public.returns;
CREATE POLICY "Device sync returns" ON public.returns
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Device sync return_items" ON public.return_items;
DROP POLICY IF EXISTS "Authenticated write return_items" ON public.return_items;
DROP POLICY IF EXISTS "Authenticated read return_items" ON public.return_items;
CREATE POLICY "Device sync return_items" ON public.return_items
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- cash_movements
DROP POLICY IF EXISTS "Device sync cash_movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Authenticated write cash_movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Authenticated read cash_movements" ON public.cash_movements;
CREATE POLICY "Device sync cash_movements" ON public.cash_movements
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- suppliers / purchases / promotions / audit
DROP POLICY IF EXISTS "Device sync suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated write suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated read suppliers" ON public.suppliers;
CREATE POLICY "Device sync suppliers" ON public.suppliers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Device sync purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated write purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated read purchases" ON public.purchases;
CREATE POLICY "Device sync purchases" ON public.purchases
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Device sync promotions" ON public.promotions;
DROP POLICY IF EXISTS "Authenticated write promotions" ON public.promotions;
DROP POLICY IF EXISTS "Authenticated read promotions" ON public.promotions;
CREATE POLICY "Device sync promotions" ON public.promotions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Device sync audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Authenticated write audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Authenticated read audit_log" ON public.audit_log;
CREATE POLICY "Device sync audit_log" ON public.audit_log
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Ensure cash_returns column exists on shifts for parity with client
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS cash_returns NUMERIC DEFAULT 0;
