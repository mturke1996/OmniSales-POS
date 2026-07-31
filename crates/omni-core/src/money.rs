use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Money(pub Decimal);

impl Money {
    pub fn zero() -> Self {
        Self(Decimal::ZERO)
    }

    pub fn from_f64(v: f64) -> Self {
        Self(Decimal::from_f64_retain(v).unwrap_or(Decimal::ZERO))
    }

    pub fn from_str_lossy(s: &str) -> Self {
        Self(Decimal::from_str(s).unwrap_or(Decimal::ZERO))
    }

    pub fn as_f64(self) -> f64 {
        use rust_decimal::prelude::ToPrimitive;
        self.0.to_f64().unwrap_or(0.0)
    }
}

impl fmt::Display for Money {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.2}", self.0)
    }
}

impl std::ops::Add for Money {
    type Output = Self;
    fn add(self, rhs: Self) -> Self {
        Self(self.0 + rhs.0)
    }
}

impl std::ops::Sub for Money {
    type Output = Self;
    fn sub(self, rhs: Self) -> Self {
        Self(self.0 - rhs.0)
    }
}

impl std::ops::Mul<Decimal> for Money {
    type Output = Self;
    fn mul(self, rhs: Decimal) -> Self {
        Self(self.0 * rhs)
    }
}
