-- OmniSales ERP & POS PostgreSQL Schema for Supabase

-- 1. Branch Settings
CREATE TABLE IF NOT EXISTS public.settings (
    branch_id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'OmniSales',
    address TEXT,
    phone TEXT,
    currency TEXT DEFAULT 'LYD',
    currency_symbol TEXT DEFAULT 'د.ل',
    locale TEXT DEFAULT 'ar-LY',
    tax_rate NUMERIC DEFAULT 0,
    industry TEXT DEFAULT 'confectionery',
    work_mode TEXT DEFAULT 'shift_based',
    pos_layout TEXT DEFAULT 'grid_cart',
    theme_key TEXT DEFAULT 'cocoa',
    walk_in_sales_enabled BOOLEAN DEFAULT true,
    thermal_width_mm INT DEFAULT 80,
    order_prefix TEXT DEFAULT 'ORD',
    invoice_prefix TEXT DEFAULT 'INV',
    receipt_footer TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Catalog
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id TEXT NOT NULL REFERENCES public.settings(branch_id) ON DELETE CASCADE,
    category_id TEXT DEFAULT 'cat-1',
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    retail_price NUMERIC NOT NULL DEFAULT 0,
    wholesale_price NUMERIC DEFAULT 0,
    unit_type TEXT DEFAULT 'piece',
    track_stock BOOLEAN DEFAULT true,
    stock_quantity NUMERIC DEFAULT 0,
    min_stock NUMERIC DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    imei TEXT,
    serial TEXT,
    oem_code TEXT,
    vehicle_fitment TEXT,
    expiry_days INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- 3. Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    balance NUMERIC DEFAULT 0, -- positive = debt
    credit_limit NUMERIC DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Customer Ledger
CREATE TABLE IF NOT EXISTS public.customer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'debit' | 'credit'
    amount NUMERIC NOT NULL,
    reference TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Shifts
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id TEXT NOT NULL REFERENCES public.settings(branch_id),
    cashier_id TEXT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_float NUMERIC NOT NULL DEFAULT 0,
    cash_sales NUMERIC DEFAULT 0,
    card_sales NUMERIC DEFAULT 0,
    debt_sales NUMERIC DEFAULT 0,
    expected_cash NUMERIC DEFAULT 0,
    closing_count NUMERIC,
    variance NUMERIC,
    status TEXT NOT NULL DEFAULT 'open' -- 'open' | 'closed'
);

-- 6. Orders & Sales
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'pos_walk_in',
    status TEXT DEFAULT 'completed',
    customer_id UUID REFERENCES public.customers(id),
    customer_name TEXT,
    customer_phone TEXT,
    delivery_address TEXT,
    delivery_date DATE,
    items JSONB NOT NULL,
    subtotal NUMERIC NOT NULL,
    discount_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 7. Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read all" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON public.customer_ledger FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON public.expenses FOR SELECT USING (true);

CREATE POLICY "Allow anon insert all" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update all" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow anon insert all" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update all" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Allow anon insert all" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert all" ON public.shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update all" ON public.shifts FOR UPDATE USING (true);
CREATE POLICY "Allow anon insert all" ON public.expenses FOR INSERT WITH CHECK (true);
