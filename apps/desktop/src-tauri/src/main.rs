#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use omni_core::{
    calculate_totals, validate_payment, BranchSettings, CartLine, IndustryProfile, Money, Order,
    OrderStatus, OrderType, PaymentMethod, PosLayout, Product, Shift, SyncAction, WorkMode,
};
use omni_db::Store;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;

struct AppState {
    store: Mutex<Store>,
    branch_id: String,
}

fn db_path() -> PathBuf {
    let dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("OmniSales");
    let _ = std::fs::create_dir_all(&dir);
    dir.join("omnisales.db")
}

#[derive(Serialize)]
struct Bootstrap {
    settings: BranchSettings,
    products: Vec<Product>,
    open_shift: Option<Shift>,
    orders: Vec<Order>,
    online: bool,
}

#[tauri::command]
fn bootstrap(state: State<'_, Arc<AppState>>) -> Result<Bootstrap, String> {
    let store = state.store.lock();
    let settings = store
        .load_settings(&state.branch_id)
        .map_err(|e| e.to_string())?;
    let products = store
        .list_products(&state.branch_id)
        .map_err(|e| e.to_string())?;
    let open_shift = store
        .open_shift(&state.branch_id)
        .map_err(|e| e.to_string())?;
    let orders = store
        .list_orders(&state.branch_id, 200)
        .map_err(|e| e.to_string())?;
    Ok(Bootstrap {
        settings,
        products,
        open_shift,
        orders,
        online: true,
    })
}

#[tauri::command]
fn save_settings(
    state: State<'_, Arc<AppState>>,
    mut settings: BranchSettings,
) -> Result<BranchSettings, String> {
    settings.branch_id = state.branch_id.clone();
    let store = state.store.lock();
    store
        .save_settings(&settings)
        .map_err(|e| e.to_string())?;
    Ok(settings)
}

#[derive(Deserialize)]
struct OpenShiftReq {
    cashier_id: String,
    opening_float: f64,
}

#[tauri::command]
fn open_shift(state: State<'_, Arc<AppState>>, req: OpenShiftReq) -> Result<Shift, String> {
    let store = state.store.lock();
    if store
        .open_shift(&state.branch_id)
        .map_err(|e| e.to_string())?
        .is_some()
    {
        return Err("توجد وردية مفتوحة بالفعل".into());
    }
    let shift = Shift::open(
        Uuid::new_v4().to_string(),
        state.branch_id.clone(),
        req.cashier_id,
        Money::from_f64(req.opening_float),
    );
    store.save_shift(&shift).map_err(|e| e.to_string())?;
    let action = SyncAction {
        id: Uuid::new_v4().to_string(),
        created_at: chrono::Utc::now(),
        entity: "shift".into(),
        action: "open".into(),
        payload: serde_json::to_value(&shift).unwrap_or_default(),
        attempts: 0,
        last_error: None,
    };
    let _ = store.enqueue_sync(&action);
    Ok(shift)
}

#[derive(Deserialize)]
struct CloseShiftReq {
    counted: f64,
}

#[tauri::command]
fn close_shift(state: State<'_, Arc<AppState>>, req: CloseShiftReq) -> Result<Shift, String> {
    let store = state.store.lock();
    let mut shift = store
        .open_shift(&state.branch_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "لا توجد وردية مفتوحة".to_string())?;
    shift.close(Money::from_f64(req.counted));
    store.save_shift(&shift).map_err(|e| e.to_string())?;
    let action = SyncAction {
        id: Uuid::new_v4().to_string(),
        created_at: chrono::Utc::now(),
        entity: "shift".into(),
        action: "close".into(),
        payload: serde_json::to_value(&shift).unwrap_or_default(),
        attempts: 0,
        last_error: None,
    };
    let _ = store.enqueue_sync(&action);
    Ok(shift)
}

#[derive(Deserialize)]
struct CheckoutReq {
    lines: Vec<CartLine>,
    discount: f64,
    method: PaymentMethod,
    cash_tendered: Option<f64>,
    card_amount: Option<f64>,
    transfer_amount: Option<f64>,
    cashier_id: String,
    customer_id: Option<String>,
    customer_name: Option<String>,
    note: Option<String>,
}

#[derive(Serialize)]
struct CheckoutResult {
    order: Order,
    change_due: f64,
}

#[tauri::command]
fn checkout(state: State<'_, Arc<AppState>>, req: CheckoutReq) -> Result<CheckoutResult, String> {
    let store = state.store.lock();
    let settings = store
        .load_settings(&state.branch_id)
        .map_err(|e| e.to_string())?;
    let open_shift = store
        .open_shift(&state.branch_id)
        .map_err(|e| e.to_string())?;

    if settings.requires_open_shift_for_walk_in() && open_shift.is_none() {
        return Err("افتح الوردية قبل البيع الفوري".into());
    }
    if !settings.walk_in_sales_enabled {
        return Err("البيع الفوري معطّل من الإعدادات".into());
    }
    if req.lines.is_empty() {
        return Err("السلة فارغة".into());
    }
    if matches!(req.method, PaymentMethod::Debt) && req.customer_id.is_none() {
        return Err("يرجى تحديد العميل لإتمام عملية البيع على الحساب (آجل)".into());
    }

    let breakdown = calculate_totals(
        &req.lines,
        Money::from_f64(req.discount),
        settings.tax_rate,
    );
    let change = validate_payment(
        breakdown.total,
        req.method,
        req.cash_tendered.map(Money::from_f64),
        req.card_amount.map(Money::from_f64),
        req.transfer_amount.map(Money::from_f64),
    )
    .map_err(|e| e.to_string())?;

    // Deduct stock before commit
    for line in &req.lines {
        if let Some(mut product) = store
            .get_product(&line.product_id)
            .map_err(|e| e.to_string())?
        {
            if product.track_stock {
                product.stock_quantity = (product.stock_quantity - line.quantity).max(0.0);
                store.upsert_product(&product).map_err(|e| e.to_string())?;
            }
        }
    }

    let order_number = format!(
        "{}-{}",
        settings.order_prefix,
        (10000 + (chrono::Utc::now().timestamp() % 90000)) as i64
    );

    let order = Order {
        id: Uuid::new_v4().to_string(),
        order_number,
        branch_id: state.branch_id.clone(),
        shift_id: open_shift.as_ref().map(|s| s.id.clone()),
        cashier_id: req.cashier_id,
        customer_id: req.customer_id.clone(),
        customer_name: req.customer_name.clone(),
        order_type: OrderType::PosWalkIn,
        status: OrderStatus::Completed,
        lines: req.lines,
        subtotal: breakdown.subtotal,
        discount: breakdown.discount,
        tax: breakdown.tax,
        total: breakdown.total,
        payment_method: Some(req.method),
        note: req.note,
        created_at: chrono::Utc::now(),
    };

    store.save_order(&order).map_err(|e| e.to_string())?;

    if let Some(mut shift) = open_shift {
        match req.method {
            PaymentMethod::Cash => {
                shift.record_cash_sale(breakdown.total);
            }
            PaymentMethod::Card | PaymentMethod::Transfer => {
                shift.record_card_sale(breakdown.total);
            }
            PaymentMethod::Debt => {
                shift.record_debt_sale(breakdown.total);
            }
            PaymentMethod::Mixed => {
                let cash_part = req
                    .cash_tendered
                    .unwrap_or(0.0)
                    .min(breakdown.total.as_f64());
                shift.record_cash_sale(Money::from_f64(cash_part));
                let rest = (breakdown.total.as_f64() - cash_part).max(0.0);
                if rest > 0.0 {
                    shift.record_card_sale(Money::from_f64(rest));
                }
            }
        }
        store.save_shift(&shift).map_err(|e| e.to_string())?;
    }

    let action = SyncAction {
        id: Uuid::new_v4().to_string(),
        created_at: chrono::Utc::now(),
        entity: "order".into(),
        action: "create".into(),
        payload: serde_json::to_value(&order).unwrap_or_default(),
        attempts: 0,
        last_error: None,
    };
    let _ = store.enqueue_sync(&action);

    Ok(CheckoutResult {
        order,
        change_due: change.as_f64(),
    })
}

#[tauri::command]
fn industry_presets() -> Vec<IndustryPresetDto> {
    [
        IndustryProfile::GeneralRetail,
        IndustryProfile::Electronics,
        IndustryProfile::SpareParts,
        IndustryProfile::Grocery,
        IndustryProfile::FoodService,
        IndustryProfile::Confectionery,
    ]
    .into_iter()
    .map(|p| IndustryPresetDto {
        id: format!("{:?}", p).to_ascii_lowercase(),
        key: match p {
            IndustryProfile::GeneralRetail => "general_retail",
            IndustryProfile::Electronics => "electronics",
            IndustryProfile::SpareParts => "spare_parts",
            IndustryProfile::Grocery => "grocery",
            IndustryProfile::FoodService => "food_service",
            IndustryProfile::Confectionery => "confectionery",
        }
        .into(),
        label_ar: p.label_ar().into(),
        suggested_layout: format!("{:?}", p.suggested_layout()),
        work_mode_default: format!("{:?}", WorkMode::ShiftBased),
        capabilities: p.capabilities(),
    })
    .collect()
}

#[derive(Serialize)]
struct IndustryPresetDto {
    id: String,
    key: String,
    label_ar: String,
    suggested_layout: String,
    work_mode_default: String,
    capabilities: omni_core::IndustryCapabilities,
}

fn main() {
    let path = db_path();
    let store = Store::open(path.to_str().unwrap_or("omnisales.db")).expect("open db");
    let branch_id = "branch-1".to_string();
    if store.list_products(&branch_id).unwrap_or_default().is_empty() {
        store.seed_demo(&branch_id).expect("seed");
    }

    let state = Arc::new(AppState {
        store: Mutex::new(store),
        branch_id,
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            bootstrap,
            save_settings,
            open_shift,
            close_shift,
            checkout,
            industry_presets
        ])
        .run(tauri::generate_context!())
        .expect("error while running OmniSales");
}

#[allow(dead_code)]
fn _layout_touch() -> PosLayout {
    PosLayout::GridCart
}
