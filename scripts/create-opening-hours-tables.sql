-- Opening Hours tables for The Slime Studio
-- Run this in Supabase SQL Editor

-- Weekly opening hours (one row per day of the week)
CREATE TABLE IF NOT EXISTS opening_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL UNIQUE, -- 0 = Sunday, 1 = Monday, ... 6 = Saturday
  is_open BOOLEAN NOT NULL DEFAULT true,
  time_slots TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Date overrides for specific dates (holidays, special events, one-off openings)
CREATE TABLE IF NOT EXISTS date_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  is_open BOOLEAN NOT NULL DEFAULT true,
  time_slots TEXT[] NOT NULL DEFAULT '{}',
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS but allow public read access (booking page needs to see opening hours)
ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_overrides ENABLE ROW LEVEL SECURITY;

-- Allow public to read opening hours (needed for booking page)
CREATE POLICY "Public can read opening_hours" ON opening_hours FOR SELECT USING (true);
CREATE POLICY "Public can read date_overrides" ON date_overrides FOR SELECT USING (true);

-- Allow authenticated admins to manage opening hours
-- (Service role key bypasses RLS, so admin API routes work automatically)
