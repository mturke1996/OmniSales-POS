use crate::money::Money;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ShiftStatus {
    Open,
    Closed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Shift {
    pub id: String,
    pub branch_id: String,
    pub cashier_id: String,
    pub opened_at: DateTime<Utc>,
    pub closed_at: Option<DateTime<Utc>>,
    pub opening_float: Money,
    #[serde(default = "Money::zero")]
    pub cash_sales: Money,
    #[serde(default = "Money::zero")]
    pub card_sales: Money,
    #[serde(default = "Money::zero")]
    pub debt_sales: Money,
    pub expected_cash: Money,
    pub closing_count: Option<Money>,
    pub variance: Option<Money>,
    pub status: ShiftStatus,
}

#[derive(Debug, Error)]
pub enum ShiftError {
    #[error("a shift is already open for this branch")]
    AlreadyOpen,
    #[error("no open shift")]
    NotOpen,
    #[error("walk-in sales require an open shift")]
    ShiftRequired,
}

impl Shift {
    pub fn open(
        id: String,
        branch_id: String,
        cashier_id: String,
        opening_float: Money,
    ) -> Self {
        Self {
            id,
            branch_id,
            cashier_id,
            opened_at: Utc::now(),
            closed_at: None,
            opening_float,
            cash_sales: Money::zero(),
            card_sales: Money::zero(),
            debt_sales: Money::zero(),
            expected_cash: opening_float,
            closing_count: None,
            variance: None,
            status: ShiftStatus::Open,
        }
    }

    pub fn record_cash_sale(&mut self, amount: Money) {
        self.cash_sales = Money::from_f64(self.cash_sales.as_f64() + amount.as_f64());
        self.expected_cash = Money::from_f64(self.expected_cash.as_f64() + amount.as_f64());
    }

    pub fn record_card_sale(&mut self, amount: Money) {
        self.card_sales = Money::from_f64(self.card_sales.as_f64() + amount.as_f64());
    }

    pub fn record_debt_sale(&mut self, amount: Money) {
        self.debt_sales = Money::from_f64(self.debt_sales.as_f64() + amount.as_f64());
    }

    pub fn handover(&mut self, counted: Money) {
        self.expected_cash = counted;
        self.opening_float = counted;
    }

    pub fn close(&mut self, counted: Money) {
        let variance = Money::from_f64(counted.as_f64() - self.expected_cash.as_f64());
        self.closing_count = Some(counted);
        self.variance = Some(variance);
        self.closed_at = Some(Utc::now());
        self.status = ShiftStatus::Closed;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn records_sales_and_closes() {
        let mut shift = Shift::open(
            "s1".into(),
            "b1".into(),
            "c1".into(),
            Money::from_f64(100.0),
        );
        shift.record_cash_sale(Money::from_f64(40.0));
        shift.record_card_sale(Money::from_f64(20.0));
        shift.record_debt_sale(Money::from_f64(10.0));
        assert!((shift.expected_cash.as_f64() - 140.0).abs() < 0.01);
        assert!((shift.cash_sales.as_f64() - 40.0).abs() < 0.01);
        assert!((shift.card_sales.as_f64() - 20.0).abs() < 0.01);
        assert!((shift.debt_sales.as_f64() - 10.0).abs() < 0.01);
        shift.close(Money::from_f64(138.0));
        assert_eq!(shift.status, ShiftStatus::Closed);
        assert!((shift.variance.unwrap().as_f64() + 2.0).abs() < 0.01);
    }
}
