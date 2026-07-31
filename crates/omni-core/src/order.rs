use crate::money::Money;
use crate::payment::PaymentMethod;
use crate::product::CartLine;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrderType {
    Pos,
    #[serde(alias = "pos_walk_in")]
    PosWalkIn,
    Delivery,
    Reservation,
    Online,
    Wholesale,
    SpecialEvent,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    New,
    InPrep,
    Ready,
    Delivering,
    Completed,
    Held,
    Cancelled,
    Partial,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    #[serde(default)]
    pub order_number: String,
    pub branch_id: String,
    pub shift_id: Option<String>,
    pub cashier_id: String,
    pub customer_id: Option<String>,
    #[serde(default)]
    pub customer_name: Option<String>,
    pub order_type: OrderType,
    pub status: OrderStatus,
    pub lines: Vec<CartLine>,
    pub subtotal: Money,
    pub discount: Money,
    pub tax: Money,
    pub total: Money,
    #[serde(default)]
    pub payment_method: Option<PaymentMethod>,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
}
