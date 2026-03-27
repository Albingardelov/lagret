-- Add min_quantity column to inventory for low-stock alerts
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_quantity NUMERIC;
