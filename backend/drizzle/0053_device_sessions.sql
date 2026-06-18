-- ESTICAD companion device sessions (bearer auth for non-browser clients).
CREATE TABLE IF NOT EXISTS esti_device_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES esti_user(id) ON DELETE CASCADE,
  client_id text NOT NULL DEFAULT 'esticad',
  device_name text NOT NULL,
  refresh_token_hash text NOT NULL,
  access_token_hash text NOT NULL,
  access_expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS esti_device_session_user_idx ON esti_device_session(user_id);
CREATE INDEX IF NOT EXISTS esti_device_session_access_hash_idx ON esti_device_session(access_token_hash);
CREATE INDEX IF NOT EXISTS esti_device_session_refresh_hash_idx ON esti_device_session(refresh_token_hash);
