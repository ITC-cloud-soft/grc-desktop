-- 011_fix_verification_code_length.sql
-- Fix: verification_codes.code column was VARCHAR(6) but stores HMAC-SHA256 hashes (64 hex chars).

ALTER TABLE verification_codes MODIFY COLUMN code VARCHAR(64) NOT NULL;
