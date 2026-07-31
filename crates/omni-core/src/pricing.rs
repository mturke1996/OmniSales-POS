use crate::money::Money;
use crate::product::CartLine;
use rust_decimal::Decimal;

#[derive(Debug, Clone)]
pub struct PriceBreakdown {
    pub subtotal: Money,
    pub discount: Money,
    pub taxable: Money,
    pub tax: Money,
    pub total: Money,
}

pub fn line_total(line: &CartLine) -> Money {
    let qty = Decimal::from_f64_retain(line.quantity).unwrap_or(Decimal::ZERO);
    line.unit_price * qty
}

pub fn calculate_totals(lines: &[CartLine], order_discount: Money, tax_rate: f64) -> PriceBreakdown {
    let subtotal_f: f64 = lines.iter().map(|l| line_total(l).as_f64()).sum();
    let subtotal = Money::from_f64(subtotal_f);
    let discount = if order_discount.as_f64() > subtotal_f {
        subtotal
    } else {
        order_discount
    };
    let taxable_f = (subtotal_f - discount.as_f64()).max(0.0);
    let tax = Money::from_f64(taxable_f * tax_rate);
    let total = Money::from_f64(taxable_f + tax.as_f64());
    PriceBreakdown {
        subtotal,
        discount,
        taxable: Money::from_f64(taxable_f),
        tax,
        total,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::product::UnitType;

    #[test]
    fn totals_with_tax_and_discount() {
        let lines = vec![CartLine {
            product_id: "p1".into(),
            name: "Item".into(),
            unit_price: Money::from_f64(100.0),
            quantity: 2.0,
            unit_type: UnitType::Piece,
            note: None,
            serial: None,
            imei: None,
        }];
        let b = calculate_totals(&lines, Money::from_f64(20.0), 0.1);
        assert!((b.subtotal.as_f64() - 200.0).abs() < 0.01);
        assert!((b.taxable.as_f64() - 180.0).abs() < 0.01);
        assert!((b.tax.as_f64() - 18.0).abs() < 0.01);
        assert!((b.total.as_f64() - 198.0).abs() < 0.01);
    }
}
