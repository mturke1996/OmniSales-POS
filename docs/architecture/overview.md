# OmniSales Architecture

## Client surfaces

1. **React PWA** (`apps/desktop`) — primary for iPhone/Android browsers and home-screen apps.
2. **Tauri desktop** — same React UI + Rust SQLite commands for native registers.
3. **Android** (`apps/android`) — Clean Architecture scaffold for a native Compose client.

## Offline model

- **Source of truth (all runtimes):** React client + IndexedDB (`apps/desktop/src/lib/offline-store.ts`) via `api.ts`.
- PWA: Service Worker (Workbox) caches shell/assets; outbox flushes to Supabase when online.
- Tauri SQLite (`omni-db`) exists as a parallel native path but is **not** invoked by the current UI (avoids IDB↔SQLite split-brain).

## Shop hardening (P0)

- Stock cannot go negative on checkout; product upserts enqueue on sale/return.
- Sequential document numbers (orders/returns/purchases/payments).
- PIN stored as PBKDF2 hash; weak/bootstrap PINs force change before session.
- Scanner Enter prefers **exact** barcode/SKU match.
- Supabase migration `009` revokes anon write; cloud sync requires authenticated session.
- Expenses can deduct from open cash drawer; Z-report printable on shift close.
- Empty-shop bootstrap (optional demo seed from Settings).

## Settings-driven POS

`BranchSettings` selects:

- `industry` → capabilities + suggested layout
- `work_mode` → `shift_based` | `open_sales`
- `pos_layout` → grid / list / touch / compact
- `walk_in_sales_enabled` → gate counter sales

## Valentino reuse

Reused: shift float/expected cash/Z-close idea, mixed payments, cart hold concepts, local-first outbox, keyboard/barcode UX.  
Redesigned: multi-industry profiles, monochrome UI, first-class PWA for iPhone.
