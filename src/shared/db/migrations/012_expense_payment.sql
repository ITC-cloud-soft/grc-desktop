-- 012_expense_payment.sql
-- Add payment tracking columns for the expense lifecycle.
-- Expense lifecycle: Create(pending=0) → Approve(1) / Reject(2) → Pay → Complete
--
-- Also fix any existing rejected expenses: value 0 was used for both
-- "pending" and "rejected"; going forward 0 = pending, 2 = rejected.

ALTER TABLE tasks
  ADD COLUMN expense_paid    TINYINT      DEFAULT NULL AFTER expense_approved_at,
  ADD COLUMN expense_paid_by VARCHAR(255) DEFAULT NULL AFTER expense_paid,
  ADD COLUMN expense_paid_at TIMESTAMP    DEFAULT NULL AFTER expense_paid_by;
