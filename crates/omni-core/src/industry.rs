use serde::{Deserialize, Serialize};

/// Business vertical — chosen once in settings and drives POS layout + units.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IndustryProfile {
    /// Phones / electronics — IMEI, serial, accessories
    Electronics,
    /// Auto / machine spare parts — OEM codes, vehicles
    SpareParts,
    /// Grocery / food — weight, expiry, barcodes
    Grocery,
    /// General retail — default grid POS
    GeneralRetail,
    /// Restaurant / cafe — modifiers, tables (future)
    FoodService,
    /// Confectionery / events — Valentino-style gift & sweets counter
    Confectionery,
}

impl IndustryProfile {
    pub fn label_ar(self) -> &'static str {
        match self {
            Self::Electronics => "هواتف وإلكترونيات",
            Self::SpareParts => "قطع غيار",
            Self::Grocery => "مواد غذائية",
            Self::GeneralRetail => "تجزئة عامة",
            Self::FoodService => "مطاعم وكافيه",
            Self::Confectionery => "حلويات ومناسبات",
        }
    }

    pub fn default_units(self) -> &'static [&'static str] {
        match self {
            Self::Electronics => &["piece", "box"],
            Self::SpareParts => &["piece", "set", "box"],
            Self::Grocery => &["piece", "gram", "kilo", "carton"],
            Self::GeneralRetail => &["piece", "box", "carton"],
            Self::FoodService => &["piece", "portion"],
            Self::Confectionery => &["piece", "box", "kilo", "portion"],
        }
    }
}

/// How the register operates day-to-day.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkMode {
    /// Cashier must open a shift before walk-in sales (Valentino pattern).
    ShiftBased,
    /// Always open — no float/Z-report gate; still logs daily analytics.
    OpenSales,
}

/// Visual / interaction layout of the POS screen — configurable in settings.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PosLayout {
    /// Classic: product grid left, cart right (Valentino default).
    GridCart,
    /// Dense list + barcode focus (spare parts / warehouse).
    ListBarcode,
    /// Large tiles for touch / food counter.
    TouchTiles,
    /// Compact tablet split.
    CompactSplit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndustryCapabilities {
    pub track_serial: bool,
    pub track_imei: bool,
    pub track_expiry: bool,
    pub weight_scale: bool,
    pub vehicle_fitment: bool,
    pub modifiers: bool,
    pub tables: bool,
}

impl IndustryProfile {
    pub fn capabilities(self) -> IndustryCapabilities {
        match self {
            Self::Electronics => IndustryCapabilities {
                track_serial: true,
                track_imei: true,
                track_expiry: false,
                weight_scale: false,
                vehicle_fitment: false,
                modifiers: false,
                tables: false,
            },
            Self::SpareParts => IndustryCapabilities {
                track_serial: true,
                track_imei: false,
                track_expiry: false,
                weight_scale: false,
                vehicle_fitment: true,
                modifiers: false,
                tables: false,
            },
            Self::Grocery => IndustryCapabilities {
                track_serial: false,
                track_imei: false,
                track_expiry: true,
                weight_scale: true,
                vehicle_fitment: false,
                modifiers: false,
                tables: false,
            },
            Self::GeneralRetail => IndustryCapabilities {
                track_serial: false,
                track_imei: false,
                track_expiry: false,
                weight_scale: false,
                vehicle_fitment: false,
                modifiers: false,
                tables: false,
            },
            Self::FoodService => IndustryCapabilities {
                track_serial: false,
                track_imei: false,
                track_expiry: true,
                weight_scale: false,
                vehicle_fitment: false,
                modifiers: true,
                tables: true,
            },
            Self::Confectionery => IndustryCapabilities {
                track_serial: false,
                track_imei: false,
                track_expiry: true,
                weight_scale: true,
                vehicle_fitment: false,
                modifiers: true,
                tables: false,
            },
        }
    }

    pub fn suggested_layout(self) -> PosLayout {
        match self {
            Self::Electronics | Self::GeneralRetail => PosLayout::GridCart,
            Self::SpareParts => PosLayout::ListBarcode,
            Self::Grocery => PosLayout::GridCart,
            Self::FoodService | Self::Confectionery => PosLayout::TouchTiles,
        }
    }
}
