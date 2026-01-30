-- FIX: Enable Full Access for Payment Sessions Flow
-- Prevents "Pending" stuck state by ensuring the payment pages can ALWAYS create and update sessions.

-- 1. Enable RLS (Good practice, but we'll be permissive)
ALTER TABLE "public"."payment_sessions" ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies to start clean
DROP POLICY IF EXISTS "Public create session" ON "public"."payment_sessions";
DROP POLICY IF EXISTS "Allow public update" ON "public"."payment_sessions";
DROP POLICY IF EXISTS "Allow public read" ON "public"."payment_sessions";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."payment_sessions";
DROP POLICY IF EXISTS "Enable insert access for all users" ON "public"."payment_sessions";
DROP POLICY IF EXISTS "Enable update access for all users" ON "public"."payment_sessions";

-- 3. create PERMISSIVE policies for the demo flow

-- Allow anyone (including Guests/Anon) to CREATE a payment session
-- This fixes the "Fallback to Offline" issue where sessions are created in memory but not DB
CREATE POLICY "Allow public insert"
ON "public"."payment_sessions"
FOR INSERT
WITH CHECK (true);

-- Allow anyone to UPDATE a session (e.g., marking it as Success)
-- Critical for the /pay/confirm page to work without login
CREATE POLICY "Allow public update"
ON "public"."payment_sessions"
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow anyone to READ sessions
-- Needed for the /pay/gateway page to listen for live updates
CREATE POLICY "Allow public read"
ON "public"."payment_sessions"
FOR SELECT
USING (true);
