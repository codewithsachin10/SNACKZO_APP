-- Migration: Add page_views table for real-time visitor tracking
-- Created: 2026-02-05

-- Table to track website visits
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,           -- Anonymous session identifier
  page_path TEXT NOT NULL,            -- e.g., '/', '/products', '/cart'
  user_agent TEXT,                    -- Browser info
  referrer TEXT,                      -- Where they came from
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional: logged-in user
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries on created_at (for live visitors count)
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert page views (anonymous tracking)
CREATE POLICY "Anyone can insert page views" 
  ON page_views 
  FOR INSERT 
  WITH CHECK (true);

-- Policy: Admins can view page views
CREATE POLICY "Admins can view page views" 
  ON page_views 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Enable real-time for this table
ALTER PUBLICATION supabase_realtime ADD TABLE page_views;

-- Grant necessary permissions
GRANT INSERT ON page_views TO anon;
GRANT INSERT ON page_views TO authenticated;
GRANT SELECT ON page_views TO authenticated;
