use crate::industry::{IndustryProfile, PosLayout, WorkMode};
use serde::{Deserialize, Serialize};

fn default_theme_key() -> String {
    "scout".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchSettings {
    pub branch_id: String,
    pub name: String,
    pub address: String,
    pub phone: String,
    pub currency: String,
    pub currency_symbol: String,
    pub locale: String,
    pub tax_rate: f64,
    pub industry: IndustryProfile,
    pub work_mode: WorkMode,
    pub pos_layout: PosLayout,
    #[serde(default = "default_theme_key")]
    pub theme_key: String,
    /// When false, walk-in/counter sales are disabled (prep/delivery only).
    pub walk_in_sales_enabled: bool,
    pub thermal_width_mm: u16,
    pub order_prefix: String,
    pub invoice_prefix: String,
    pub receipt_footer: String,
    #[serde(default)]
    pub supabase_url: Option<String>,
    #[serde(default)]
    pub supabase_anon_key: Option<String>,
    #[serde(default)]
    pub cloud_sync_enabled: bool,
}

impl Default for BranchSettings {
    fn default() -> Self {
        Self {
            branch_id: "branch-1".into(),
            name: "OmniSales".into(),
            address: String::new(),
            phone: String::new(),
            currency: "LYD".into(),
            currency_symbol: "د.ل".into(),
            locale: "ar-LY".into(),
            tax_rate: 0.0,
            industry: IndustryProfile::GeneralRetail,
            work_mode: WorkMode::ShiftBased,
            pos_layout: PosLayout::GridCart,
            theme_key: default_theme_key(),
            walk_in_sales_enabled: true,
            thermal_width_mm: 80,
            order_prefix: "ORD".into(),
            invoice_prefix: "INV".into(),
            receipt_footer: "شكراً لتعاملكم معنا".into(),
            supabase_url: None,
            supabase_anon_key: None,
            cloud_sync_enabled: false,
        }
    }
}

impl BranchSettings {
    /// Apply industry defaults for layout + capabilities-aware toggles.
    pub fn apply_industry_defaults(&mut self) {
        self.pos_layout = self.industry.suggested_layout();
    }

    pub fn requires_open_shift_for_walk_in(&self) -> bool {
        self.walk_in_sales_enabled && matches!(self.work_mode, WorkMode::ShiftBased)
    }
}
