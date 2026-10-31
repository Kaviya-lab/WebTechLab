-- =============================================================
-- Person B Migration: Per-item fulfillment tracking
-- File: database/changes_B.sql
--
-- HOW TO APPLY:
--   In MySQL client / Workbench:
--     USE marketplace;
--     SOURCE database/changes_B.sql;
--
--   Or from terminal:
--     mysql -u root -p marketplace < database/changes_B.sql
--
-- SAFE FOR EXISTING DATA:
--   DEFAULT 'pending' means every existing order_item row
--   automatically gets item_status = 'pending'.
--   No existing rows are deleted or modified destructively.
--
-- MYSQL VERSION NOTE:
--   ADD COLUMN IF NOT EXISTS and CREATE INDEX IF NOT EXISTS
--   require MySQL 8.0.3+.  For MySQL 5.7, use the alternative
--   procedure block commented out at the bottom of this file.
-- =============================================================

USE marketplace;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS item_status
    ENUM('pending','processing','shipped','delivered','cancelled')
    NOT NULL DEFAULT 'pending'
    COMMENT 'Per-item fulfillment status managed by the selling merchant';

CREATE INDEX IF NOT EXISTS idx_oi_seller_status
  ON order_items (seller_id, item_status);

-- =============================================================
-- VERIFY (optional — remove before production use):
-- =============================================================
-- DESCRIBE order_items;
-- SHOW INDEX FROM order_items WHERE Key_name = 'idx_oi_seller_status';


-- =============================================================
-- MySQL 5.7 COMPATIBLE ALTERNATIVE (uncomment if needed):
-- Replaces the ADD COLUMN IF NOT EXISTS statement above.
-- =============================================================
/*
DROP PROCEDURE IF EXISTS add_item_status_column;
DELIMITER //
CREATE PROCEDURE add_item_status_column()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'marketplace'
      AND TABLE_NAME   = 'order_items'
      AND COLUMN_NAME  = 'item_status'
  ) THEN
    ALTER TABLE order_items
      ADD COLUMN item_status
        ENUM('pending','processing','shipped','delivered','cancelled')
        NOT NULL DEFAULT 'pending';
  END IF;
END //
DELIMITER ;
CALL add_item_status_column();
DROP PROCEDURE IF EXISTS add_item_status_column;
*/
