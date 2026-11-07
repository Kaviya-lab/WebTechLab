-- Per-item fulfillment tracking for seller orders.
-- Run from the project root with:
--   mysql -u root -p < database/migrations/add_item_fulfillment_status.sql
--
-- This migration preserves existing order_items rows. Existing rows receive
-- item_status = 'pending' when the NOT NULL column is added.

USE marketplace;

-- Add the status column only when it is absent from marketplace.order_items.
SELECT COUNT(*) INTO @item_status_column_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'order_items'
  AND COLUMN_NAME = 'item_status';

SET @item_status_column_ddl = IF(
  @item_status_column_exists = 0,
  'ALTER TABLE order_items
     ADD COLUMN item_status ENUM(''pending'', ''processing'', ''shipped'', ''delivered'', ''cancelled'')
     NOT NULL DEFAULT ''pending''
     COMMENT ''Per-item fulfillment status managed by the selling merchant''',
  'SELECT 1'
);

PREPARE item_status_column_stmt FROM @item_status_column_ddl;
EXECUTE item_status_column_stmt;
DEALLOCATE PREPARE item_status_column_stmt;

-- Add the seller/status index only when its name is absent from the table.
SELECT COUNT(*) INTO @seller_status_index_exists
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'order_items'
  AND INDEX_NAME = 'idx_oi_seller_status';

SET @seller_status_index_ddl = IF(
  @seller_status_index_exists = 0,
  'CREATE INDEX idx_oi_seller_status ON order_items (seller_id, item_status)',
  'SELECT 1'
);

PREPARE seller_status_index_stmt FROM @seller_status_index_ddl;
EXECUTE seller_status_index_stmt;
DEALLOCATE PREPARE seller_status_index_stmt;
