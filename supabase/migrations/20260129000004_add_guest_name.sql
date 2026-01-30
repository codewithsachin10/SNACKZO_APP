-- Add guest_name column to payment_sessions
-- This allows storing the customer name even if they are not a registered user or not logged in.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payment_sessions' 
        AND column_name = 'guest_name'
    ) THEN
        ALTER TABLE "public"."payment_sessions" 
        ADD COLUMN "guest_name" TEXT;
    END IF;
END $$;
