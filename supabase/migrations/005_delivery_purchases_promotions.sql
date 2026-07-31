-- Delivery fields on orders + suppliers / purchases / promotions / audit_log

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_driver TEXT,
  ADD COLUMN IF NOT EXISTS settled_to_shift BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.shifts(id);

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS default_delivery_fee NUMERIC DEFAULT 5,
  ADD COLUMN IF NOT EXISTS owner_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS cloud_sync_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS supabase_url TEXT,
  ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT;

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'percent',
  value NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  min_subtotal NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  meta JSONB
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow anon all suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow anon all purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow anon all promotions" ON public.promotions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow anon all audit_log" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow anon update orders" ON public.orders FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
