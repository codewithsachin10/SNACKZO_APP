-- Enable Update Access for Payment Sessions (Critical for Checkout Flow)
-- This allows the confirmation page to mark a transaction as 'success' even if the user is not logged in.

DROP POLICY IF EXISTS "Allow public update" ON "public"."payment_sessions";

CREATE POLICY "Allow public update"
ON "public"."payment_sessions"
FOR UPDATE
USING (true)
WITH CHECK (true);
