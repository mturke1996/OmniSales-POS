use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Ordered outbox entry — mirrors Valentino Dexie sync queue, local-first.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncAction {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub entity: String,
    pub action: String,
    pub payload: serde_json::Value,
    pub attempts: u32,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncState {
    Idle,
    Syncing,
    Offline,
    Error,
}
