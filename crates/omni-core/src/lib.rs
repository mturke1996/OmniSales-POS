//! OmniSales domain core — industry-agnostic POS logic.
//! Ported concepts from Valentino POS: shifts, payments, pricing, outbox sync.

pub mod industry;
pub mod money;
pub mod order;
pub mod payment;
pub mod pricing;
pub mod product;
pub mod settings;
pub mod shift;
pub mod sync;

pub use industry::*;
pub use money::*;
pub use order::*;
pub use payment::*;
pub use pricing::*;
pub use product::*;
pub use settings::*;
pub use shift::*;
pub use sync::*;
