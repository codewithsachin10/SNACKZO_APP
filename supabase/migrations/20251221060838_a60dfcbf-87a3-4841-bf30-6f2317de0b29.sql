-- Add notification_preference column to runners table
ALTER TABLE public.runners ADD COLUMN IF NOT EXISTS notification_preference TEXT DEFAULT 'sms' CHECK (notification_preference IN ('sms', 'whatsapp', 'both'));

-- Add notification_preference column to profiles table for customers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preference TEXT DEFAULT 'push' CHECK (notification_preference IN ('push', 'whatsapp', 'both'));