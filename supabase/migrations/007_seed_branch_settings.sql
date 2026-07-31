-- Seed default branch settings so first sync/pull has a settings row.
INSERT INTO public.settings (
  branch_id,
  name,
  address,
  phone,
  currency,
  currency_symbol,
  locale,
  tax_rate,
  industry,
  work_mode,
  pos_layout,
  theme_key,
  walk_in_sales_enabled,
  thermal_width_mm,
  order_prefix,
  invoice_prefix,
  receipt_footer,
  default_delivery_fee
)
VALUES (
  'branch-1',
  'OmniSales POS',
  'طرابلس',
  '091-0000000',
  'LYD',
  'د.ل',
  'ar-LY',
  0,
  'confectionery',
  'shift_based',
  'grid_cart',
  'scout',
  true,
  80,
  'ORD',
  'INV',
  'شكراً لزيارتكم!',
  5
)
ON CONFLICT (branch_id) DO NOTHING;
