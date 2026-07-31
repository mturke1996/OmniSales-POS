//! Local SQLite store — offline-first register database.

use omni_core::{
    BranchSettings, IndustryProfile, Order, PosLayout, Product, Shift, SyncAction, WorkMode,
};
use rusqlite::{params, Connection};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DbError {
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Msg(String),
}

pub struct Store {
    conn: Connection,
}

impl Store {
    pub fn open(path: &str) -> Result<Self, DbError> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let store = Self { conn };
        store.migrate()?;
        Ok(store)
    }

    pub fn open_in_memory() -> Result<Self, DbError> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;
        let store = Self { conn };
        store.migrate()?;
        Ok(store)
    }

    fn migrate(&self) -> Result<(), DbError> {
        self.conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS settings (
              branch_id TEXT PRIMARY KEY,
              json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS products (
              id TEXT PRIMARY KEY,
              branch_id TEXT NOT NULL,
              json TEXT NOT NULL,
              barcode TEXT NOT NULL,
              name TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

            CREATE TABLE IF NOT EXISTS shifts (
              id TEXT PRIMARY KEY,
              branch_id TEXT NOT NULL,
              status TEXT NOT NULL,
              json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sync_outbox (
              id TEXT PRIMARY KEY,
              created_at TEXT NOT NULL,
              json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS orders (
              id TEXT PRIMARY KEY,
              branch_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              json TEXT NOT NULL
            );
            "#,
        )?;
        Ok(())
    }

    pub fn save_settings(&self, settings: &BranchSettings) -> Result<(), DbError> {
        let json = serde_json::to_string(settings)?;
        self.conn.execute(
            "INSERT INTO settings(branch_id, json) VALUES(?1, ?2)
             ON CONFLICT(branch_id) DO UPDATE SET json=excluded.json",
            params![settings.branch_id, json],
        )?;
        Ok(())
    }

    pub fn load_settings(&self, branch_id: &str) -> Result<BranchSettings, DbError> {
        let mut stmt = self
            .conn
            .prepare("SELECT json FROM settings WHERE branch_id = ?1")?;
        let mut rows = stmt.query(params![branch_id])?;
        if let Some(row) = rows.next()? {
            let json: String = row.get(0)?;
            Ok(serde_json::from_str(&json)?)
        } else {
            let mut defaults = BranchSettings::default();
            defaults.branch_id = branch_id.into();
            self.save_settings(&defaults)?;
            Ok(defaults)
        }
    }

    pub fn upsert_product(&self, product: &Product) -> Result<(), DbError> {
        let json = serde_json::to_string(product)?;
        self.conn.execute(
            "INSERT INTO products(id, branch_id, json, barcode, name)
             VALUES(?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
               json=excluded.json, barcode=excluded.barcode, name=excluded.name",
            params![
                product.id,
                product.branch_id,
                json,
                product.barcode,
                product.name
            ],
        )?;
        Ok(())
    }

    pub fn get_product(&self, id: &str) -> Result<Option<Product>, DbError> {
        let mut stmt = self
            .conn
            .prepare("SELECT json FROM products WHERE id = ?1 LIMIT 1")?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            let json: String = row.get(0)?;
            Ok(Some(serde_json::from_str(&json)?))
        } else {
            Ok(None)
        }
    }

    pub fn list_products(&self, branch_id: &str) -> Result<Vec<Product>, DbError> {
        let mut stmt = self
            .conn
            .prepare("SELECT json FROM products WHERE branch_id = ?1 ORDER BY name")?;
        let rows = stmt.query_map(params![branch_id], |row| {
            let json: String = row.get(0)?;
            Ok(json)
        })?;
        let mut out = Vec::new();
        for r in rows {
            out.push(serde_json::from_str(&r?)?);
        }
        Ok(out)
    }

    pub fn find_by_barcode(&self, barcode: &str) -> Result<Option<Product>, DbError> {
        let mut stmt = self
            .conn
            .prepare("SELECT json FROM products WHERE barcode = ?1 LIMIT 1")?;
        let mut rows = stmt.query(params![barcode])?;
        if let Some(row) = rows.next()? {
            let json: String = row.get(0)?;
            Ok(Some(serde_json::from_str(&json)?))
        } else {
            Ok(None)
        }
    }

    pub fn save_shift(&self, shift: &Shift) -> Result<(), DbError> {
        let json = serde_json::to_string(shift)?;
        let status = match shift.status {
            omni_core::ShiftStatus::Open => "open",
            omni_core::ShiftStatus::Closed => "closed",
        };
        self.conn.execute(
            "INSERT INTO shifts(id, branch_id, status, json) VALUES(?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET status=excluded.status, json=excluded.json",
            params![shift.id, shift.branch_id, status, json],
        )?;
        Ok(())
    }

    pub fn open_shift(&self, branch_id: &str) -> Result<Option<Shift>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT json FROM shifts WHERE branch_id = ?1 AND status = 'open' LIMIT 1",
        )?;
        let mut rows = stmt.query(params![branch_id])?;
        if let Some(row) = rows.next()? {
            let json: String = row.get(0)?;
            Ok(Some(serde_json::from_str(&json)?))
        } else {
            Ok(None)
        }
    }

    pub fn save_order(&self, order: &Order) -> Result<(), DbError> {
        let json = serde_json::to_string(order)?;
        self.conn.execute(
            "INSERT INTO orders(id, branch_id, created_at, json) VALUES(?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET json=excluded.json",
            params![
                order.id,
                order.branch_id,
                order.created_at.to_rfc3339(),
                json
            ],
        )?;
        Ok(())
    }

    pub fn list_orders(&self, branch_id: &str, limit: usize) -> Result<Vec<Order>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT json FROM orders WHERE branch_id = ?1 ORDER BY created_at DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![branch_id, limit as i64], |row| {
            let json: String = row.get(0)?;
            Ok(json)
        })?;
        let mut out = Vec::new();
        for r in rows {
            out.push(serde_json::from_str(&r?)?);
        }
        Ok(out)
    }

    pub fn enqueue_sync(&self, action: &SyncAction) -> Result<(), DbError> {
        let json = serde_json::to_string(action)?;
        self.conn.execute(
            "INSERT INTO sync_outbox(id, created_at, json) VALUES(?1, ?2, ?3)",
            params![action.id, action.created_at.to_rfc3339(), json],
        )?;
        Ok(())
    }

    pub fn pending_sync(&self, limit: usize) -> Result<Vec<SyncAction>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT json FROM sync_outbox ORDER BY created_at ASC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], |row| {
            let json: String = row.get(0)?;
            Ok(json)
        })?;
        let mut out = Vec::new();
        for r in rows {
            out.push(serde_json::from_str(&r?)?);
        }
        Ok(out)
    }

    pub fn remove_sync(&self, id: &str) -> Result<(), DbError> {
        self.conn
            .execute("DELETE FROM sync_outbox WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn seed_demo(&self, branch_id: &str) -> Result<(), DbError> {
        let mut settings = BranchSettings::default();
        settings.branch_id = branch_id.into();
        settings.name = "فرع تجريبي".into();
        settings.industry = IndustryProfile::GeneralRetail;
        settings.work_mode = WorkMode::ShiftBased;
        settings.pos_layout = PosLayout::GridCart;
        self.save_settings(&settings)?;

        let demos = [
            ("SKU-001", "8901001", "منتج تجريبي أ", 25.0, 45.0),
            ("SKU-002", "8901002", "منتج تجريبي ب", 10.0, 18.5),
            ("SKU-003", "8901003", "منتج تجريبي ج", 40.0, 72.0),
            ("SKU-004", "8901004", "كابل شحن", 3.0, 12.0),
            ("SKU-005", "8901005", "زيت محرك 5W30", 18.0, 35.0),
            ("SKU-006", "8901006", "حليب كامل الدسم 1ل", 2.0, 4.5),
        ];

        for (i, (sku, barcode, name, cost, retail)) in demos.iter().enumerate() {
            let p = Product {
                id: format!("prod-{i}"),
                branch_id: branch_id.into(),
                category_id: "cat-1".into(),
                sku: (*sku).into(),
                barcode: (*barcode).into(),
                name: (*name).into(),
                cost_price: omni_core::Money::from_f64(*cost),
                retail_price: omni_core::Money::from_f64(*retail),
                wholesale_price: omni_core::Money::from_f64(retail * 0.85),
                unit_type: omni_core::UnitType::Piece,
                track_stock: true,
                stock_quantity: 100.0,
                min_stock: 5.0,
                is_active: true,
                image_url: None,
                imei: None,
                serial: None,
                oem_code: None,
                vehicle_fitment: None,
                expiry_days: None,
            };
            self.upsert_product(&p)?;
        }
        Ok(())
    }
}
