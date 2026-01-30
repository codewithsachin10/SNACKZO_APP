-- Fix missing Foreign Key on payment_sessions table
-- This allows fetching user profile data when querying payment_sessions

DO $$
BEGIN
    -- 1. Ensure user_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'payment_sessions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE "public"."payment_sessions" 
        ADD COLUMN "user_id" UUID;
    END IF;

    -- 2. Add Foreign Key Constraint
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payment_sessions_user' 
        AND table_name = 'payment_sessions'
    ) THEN
        ALTER TABLE "public"."payment_sessions"
        ADD CONSTRAINT "fk_payment_sessions_user"
        FOREIGN KEY ("user_id")
        REFERENCES "public"."profiles"("id")
        ON DELETE SET NULL;
    END IF;
END $$;
