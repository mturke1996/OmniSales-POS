use crate::money::Money;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UnitType {
    Piece,
    Gram,
    Kilo,
    Box,
    Carton,
    Set,
    Portion,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub branch_id: String,
    pub name: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub branch_id: String,
    pub category_id: String,
    pub sku: String,
    pub barcode: String,
    pub name: String,
    pub cost_price: Money,
    pub retail_price: Money,
    pub wholesale_price: Money,
    pub unit_type: UnitType,
    pub track_stock: bool,
    pub stock_quantity: f64,
    pub min_stock: f64,
    pub is_active: bool,
    pub image_url: Option<String>,
    /// Electronics
    pub imei: Option<String>,
    pub serial: Option<String>,
    /// Spare parts
    pub oem_code: Option<String>,
    pub vehicle_fitment: Option<String>,
    /// Grocery
    pub expiry_days: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CartLine {
    pub product_id: String,
    pub name: String,
    pub unit_price: Money,
    pub quantity: f64,
    pub unit_type: UnitType,
    pub note: Option<String>,
    pub serial: Option<String>,
    pub imei: Option<String>,
}
