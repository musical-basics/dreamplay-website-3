-- ============================================================================
-- Migration: reservation_decisions_preorder_link
-- Adds a preorder_id foreign key to reservation_decisions so decisions can be
-- formally linked to a specific preorder_orders record.
--
-- Run AFTER 20260416000000_create_preorder_orders.sql.
--
-- Note: For V1, preorder_id is also stored in order_metadata (JSONB) as a
-- belt-and-suspenders fallback. This column is the canonical FK for querying.
-- ============================================================================

ALTER TABLE reservation_decisions
    ADD COLUMN IF NOT EXISTS preorder_id UUID
        REFERENCES preorder_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reservation_decisions_preorder_id_idx
    ON reservation_decisions (preorder_id);
