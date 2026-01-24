-- ==========================================
-- PHASE 3 FIX: Notifications Schema Update
-- ==========================================

-- Add is_archived to match component
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_archived') THEN
        ALTER TABLE public.notifications ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Ensure priority column exists too if used
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
        ALTER TABLE public.notifications ADD COLUMN priority TEXT DEFAULT 'normal';
    END IF;

    -- Ensure image_url column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'image_url') THEN
        ALTER TABLE public.notifications ADD COLUMN image_url TEXT;
    END IF;

    -- Ensure order_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'order_id') THEN
        ALTER TABLE public.notifications ADD COLUMN order_id UUID;
    END IF;
END $$;
