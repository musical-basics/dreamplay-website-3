# Preorder Order Layer — V1 Implementation

**Date:** 2026-04-17
**Status:** Implemented, pending DB migration and data import

---

## What this is

V1 of the internal preorder order layer. It connects the imported Shopify order snapshot to the buyer portal so `/my-reservation` shows real order data (order number, amount paid, payment type, product) for the logged-in buyer.

This replaces the fully static portal experience — where decision choices were recorded but no real order context was shown — with one backed by imported order records.

---

## Files added / changed

### New files

| File | Purpose |
|---|---|
| `src/lib/preorders.ts` | Types, pure parsing functions, and primary preorder DB query |
| `supabase/migrations/20260416000000_create_preorder_orders.sql` | Creates `preorder_orders` table with RLS |
| `supabase/migrations/20260416000001_reservation_decisions_preorder_link.sql` | Adds `preorder_id` FK to `reservation_decisions` |
| `scripts/import-preorders.ts` | Upserts the canonical CSV snapshot into Supabase |
| `scripts/verify-preorder-logic.ts` | Local verification of parsing + selection logic (no Supabase needed) |
| `docs/preorder-order-layer-v1.md` | This file |

### Modified files

| File | Change |
|---|---|
| `src/actions/reservation-actions.ts` | Added `getPreorderByEmail()` wrapper using service-role client; re-exports `PreorderOrder` type |
| `src/app/(website-pages)/my-reservation/page.tsx` | Fetches preorder in parallel with decision; passes to module |
| `src/app/(website-pages)/my-reservation/ReservationDecisionModule.tsx` | Accepts `preorderOrder` prop; shows `OrderSummaryCard`; attaches preorder metadata to decision saves |

---

## Supabase setup steps (run once)

**Step 1 — Run migrations in Supabase SQL Editor** (or `supabase db push` if CLI configured):

```
supabase/migrations/20260416000000_create_preorder_orders.sql
supabase/migrations/20260416000001_reservation_decisions_preorder_link.sql
```

Run them in order. Migration 1 creates the table. Migration 2 adds the FK.

**Step 2 — Import the order snapshot:**

```bash
# From repo root:
npx dotenv -e .env.local -- tsx scripts/import-preorders.ts
```

The script reads `../../data/dreamplay/orders/2026-04-16-orders-normalized.csv` relative to the repo. Set `ORDERS_CSV_PATH` env var to override. The import is idempotent — safe to re-run.

Expected output:
```
Loaded 56 rows from CSV
Upserted 56 records into preorder_orders.
Payment type breakdown:
  full_payment: 45
  deposit_50: 5
  waitlist_reservation: 6
```

---

## Data model

### `preorder_orders`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `order_name` | TEXT | e.g. `#1103` |
| `raw_shopify_id` | TEXT | Raw Shopify numeric ID |
| `import_batch_id` | TEXT | e.g. `2026-04-16` |
| `source` | TEXT | `shopify-csv` for V1 |
| `email` | TEXT | Normalized (lowercased) |
| `customer_name` | TEXT | |
| `created_at` | TIMESTAMPTZ | Shopify order date |
| `financial_status` | TEXT | `paid` / `authorized` / `partially_refunded` |
| `fulfillment_status` | TEXT | `unfulfilled` for all V1 orders |
| `total_paid_usd` | NUMERIC | Amount actually paid (from Shopify `Total`) |
| `payment_type` | TEXT | `full_payment` / `deposit_50` / `waitlist_reservation` |
| `is_reservation` | BOOLEAN | |
| `lineitem_name` | TEXT | Raw Shopify lineitem string |
| `product_line` | TEXT | `pro` / `bundle` / `keyboard_only` / `one` / `unknown` |
| `size_variant` | TEXT | `DS5.5` / `DS6.0` / null |
| `finish` | TEXT | `Black` / `White` / `Midnight Black` / `Aztec Gold` / null |

RLS: authenticated users can only read rows where `email = lower(auth.email())`. All writes use service role.

---

## Key business rules baked in

- **payment_type is derived from `lineitem_name`**, not the CSV column. The CSV uses `half_reservation`; the internal V1 canonical value is `deposit_50`. See `derivePaymentType()` in `src/lib/preorders.ts`.
- **Amount paid comes from `Total`** (the `total_paid_usd` column), not inferred from current product pricing.
- **Aztec Gold and Nightmare Black are Pro-only.** These finishes only appear in lineitem names that also contain `Pro`, so `parseProductMeta()` naturally maps them to `product_line=pro`.
- **Primary preorder selection** for buyers with multiple orders is deterministic:
  1. `full_payment` or `deposit_50` wins over `waitlist_reservation`
  2. Tie-break: newest `created_at`
- **Portal data is private.** RLS on `preorder_orders` + service-role reads in server actions ensure no cross-buyer visibility.

---

## Blockers / limitations for V1

- **Supabase credentials not available in this env** — migrations and data import must be run manually.
- The `preorder_id` FK on `reservation_decisions` requires migration 2 to be run. For V1, `preorder_id` is also stored in `order_metadata` (JSONB) as a backward-compatible fallback, so decision saves work before/after migration.
- If `preorder_orders` is empty (migration not yet run), `getPreorderByEmail()` returns `null` and the portal renders without the order summary card — graceful degradation.
- This is a local snapshot import, not a live Shopify sync. Future V2 work should add a real Shopify Admin API webhook or polling sync.

---

## Local verification

No Supabase needed:

```bash
npx tsx scripts/verify-preorder-logic.ts
```

Expected: `All checks passed. 23 passed, 0 failed`
