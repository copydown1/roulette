-- Run this in your Supabase SQL editor to create the required table and policies.

CREATE TABLE IF NOT EXISTS roulette_spins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  number      INTEGER NOT NULL CHECK (number >= 0 AND number <= 36),
  win         BOOLEAN,
  net         DECIMAL(12, 4),
  dose        DECIMAL(12, 4),
  predicted   INTEGER[] DEFAULT '{}',
  mode        TEXT NOT NULL CHECK (mode IN ('history', 'live')),
  bet_mode    TEXT NOT NULL CHECK (bet_mode IN ('numbers', 'sectors', 'dozens', 'columns')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE roulette_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON roulette_spins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON roulette_spins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own" ON roulette_spins
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS roulette_spins_user_created
  ON roulette_spins (user_id, created_at ASC);

-- Storage bucket for screenshot imports (run in Supabase Dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true)
-- ON CONFLICT DO NOTHING;
--
-- CREATE POLICY "authenticated upload screenshots" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'screenshots');
--
-- CREATE POLICY "public read screenshots" ON storage.objects
--   FOR SELECT USING (bucket_id = 'screenshots');
