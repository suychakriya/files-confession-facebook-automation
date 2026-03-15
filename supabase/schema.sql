-- Run this SQL in your Supabase project:
-- Dashboard → SQL Editor → New query → paste and run

CREATE TABLE confessions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  confession_number BIGINT      GENERATED ALWAYS AS IDENTITY,
  content           TEXT        NOT NULL,
  ip_hash           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_posted         BOOLEAN     DEFAULT FALSE NOT NULL,
  posted_at         TIMESTAMPTZ
);

-- Index for fetching unposted confessions efficiently
CREATE INDEX idx_confessions_is_posted ON confessions (is_posted, created_at);

-- Index for rate limiting lookups
CREATE INDEX idx_confessions_ip_hash ON confessions (ip_hash, created_at);

-- Row Level Security
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;

-- Anyone can read confessions (public feed)
CREATE POLICY "Public can read confessions"
  ON confessions FOR SELECT
  USING (true);

-- Anyone can insert (anonymous submissions)
CREATE POLICY "Anyone can submit a confession"
  ON confessions FOR INSERT
  WITH CHECK (true);

-- Only service role can update (mark as posted)
-- Service role bypasses RLS by default, so no extra policy needed for UPDATE.


-- ─── IF YOU ALREADY CREATED THE TABLE, RUN THESE INSTEAD ───────────────────
-- ALTER TABLE confessions ADD COLUMN confession_number BIGINT GENERATED ALWAYS AS IDENTITY;
-- ALTER TABLE confessions ADD COLUMN ip_hash TEXT;
-- CREATE INDEX idx_confessions_ip_hash ON confessions (ip_hash, created_at);
-- ────────────────────────────────────────────────────────────────────────────
