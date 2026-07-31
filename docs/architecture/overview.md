# OmniSales Architecture

## Client surfaces

1. **React PWA** (`apps/desktop`) — primary for iPhone/Android browsers and home-screen apps.
2. **Tauri desktop** — same React UI + Rust SQLite commands for native registers.
3. **Android** (`apps/android`) — Clean Architecture scaffold for a native Compose client.

## Offline model

- PWA: Service Worker (Workbox) caches shell/assets; IndexedDB (`idb-keyval`) stores settings, catalog, open shift, sales outbox.
- Desktop: `omni-db` SQLite with WAL + ordered sync outbox (Valentino Dexie pattern, ported).

## Settings-driven POS

`BranchSettings` selects:

- `industry` → capabilities + suggested layout
- `work_mode` → `shift_based` | `open_sales`
- `pos_layout` → grid / list / touch / compact
- `walk_in_sales_enabled` → gate counter sales

## Valentino reuse

Reused: shift float/expected cash/Z-close idea, mixed payments, cart hold concepts, local-first outbox, keyboard/barcode UX.  
Redesigned: multi-industry profiles, real native desktop DB, monochrome UI, first-class PWA for iPhone.
