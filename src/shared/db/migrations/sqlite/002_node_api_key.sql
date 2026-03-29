ALTER TABLE nodes ADD COLUMN api_key_id TEXT;
ALTER TABLE nodes ADD COLUMN api_key_authorized INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_node_api_key_id ON nodes(api_key_id);
