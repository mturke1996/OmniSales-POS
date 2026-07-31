use crate::money::Money;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PaymentMethod {
    Cash,
    Card,
    Transfer,
    Mixed,
    /// On-account / آجل — TS wire name is `debt` (legacy alias: `credit`).
    #[serde(alias = "credit")]
    Debt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: String,
    pub order_id: String,
    pub method: PaymentMethod,
    pub amount: Money,
    pub cash_tendered: Option<Money>,
    pub card_amount: Option<Money>,
    pub transfer_amount: Option<Money>,
    pub change_due: Money,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Error)]
pub enum PaymentError {
    #[error("mixed payment parts do not equal due amount")]
    MixedMismatch,
    #[error("cash tendered is less than due")]
    InsufficientCash,
    #[error("amount must be positive")]
    InvalidAmount,
}

pub fn validate_payment(
    due: Money,
    method: PaymentMethod,
    cash: Option<Money>,
    card: Option<Money>,
    transfer: Option<Money>,
) -> Result<Money, PaymentError> {
    if due.as_f64() <= 0.0 {
        return Err(PaymentError::InvalidAmount);
    }
    match method {
        PaymentMethod::Cash => {
            let tendered = cash.unwrap_or(due);
            if tendered.as_f64() + 1e-9 < due.as_f64() {
                return Err(PaymentError::InsufficientCash);
            }
            Ok(Money::from_f64(tendered.as_f64() - due.as_f64()))
        }
        PaymentMethod::Card | PaymentMethod::Transfer | PaymentMethod::Debt => Ok(Money::zero()),
        PaymentMethod::Mixed => {
            let c = cash.map(|m| m.as_f64()).unwrap_or(0.0);
            let k = card.map(|m| m.as_f64()).unwrap_or(0.0);
            let t = transfer.map(|m| m.as_f64()).unwrap_or(0.0);
            let sum = c + k + t;
            if (sum - due.as_f64()).abs() > 0.01 {
                return Err(PaymentError::MixedMismatch);
            }
            Ok(Money::zero())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cash_change_and_insufficient() {
        let change = validate_payment(
            Money::from_f64(50.0),
            PaymentMethod::Cash,
            Some(Money::from_f64(70.0)),
            None,
            None,
        )
        .unwrap();
        assert!((change.as_f64() - 20.0).abs() < 0.01);
        assert!(validate_payment(
            Money::from_f64(50.0),
            PaymentMethod::Cash,
            Some(Money::from_f64(40.0)),
            None,
            None,
        )
        .is_err());
    }

    #[test]
    fn debt_and_mixed_ok() {
        assert!(validate_payment(
            Money::from_f64(30.0),
            PaymentMethod::Debt,
            None,
            None,
            None,
        )
        .is_ok());
        assert!(validate_payment(
            Money::from_f64(100.0),
            PaymentMethod::Mixed,
            Some(Money::from_f64(40.0)),
            Some(Money::from_f64(60.0)),
            None,
        )
        .is_ok());
        assert!(validate_payment(
            Money::from_f64(100.0),
            PaymentMethod::Mixed,
            Some(Money::from_f64(40.0)),
            Some(Money::from_f64(50.0)),
            None,
        )
        .is_err());
    }

    #[test]
    fn debt_serde_aliases() {
        let d: PaymentMethod = serde_json::from_str("\"debt\"").unwrap();
        let c: PaymentMethod = serde_json::from_str("\"credit\"").unwrap();
        assert_eq!(d, PaymentMethod::Debt);
        assert_eq!(c, PaymentMethod::Debt);
        assert_eq!(serde_json::to_string(&PaymentMethod::Debt).unwrap(), "\"debt\"");
    }
}
