-- Add Comprehensive Professional Feature Toggles
-- This migration populates the feature_toggles table with a robust set of controls for the admin dashboard.

-- 1. Add icon_key column if it doesn't exist (for frontend mapping)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feature_toggles' AND column_name = 'icon_key') THEN
        ALTER TABLE public.feature_toggles ADD COLUMN icon_key TEXT DEFAULT 'settings';
    END IF;
END $$;

-- 2. Insert Features
INSERT INTO public.feature_toggles (feature_name, display_name, description, is_enabled, category, icon_key)
VALUES 
    -- 🏪 Operations & Logistics
    ('store_open_status', 'Master Store Status', 'Global switch to open or close the store. When closed, no new orders can be placed.', true, 'operations', 'store'),
    ('enable_delivery', 'Delivery Service', 'Toggle delivery availability. If disabled, store switches to "Pickup Only" mode.', true, 'operations', 'truck'),
    ('auto_runner_logic', 'AI Runner Assignment', 'Automatically assign the nearest available runner to new orders using geolocation logic.', true, 'operations', 'bot'),
    
    -- 💰 Payments & Finance
    ('enable_cod', 'Cash on Delivery (COD)', 'Allow customers to pay via Cash on Delivery. Disable to force online payments.', true, 'financial', 'banknote'),
    ('enable_tips', 'Runner Tipping', 'Enable the tipping interface during checkout to allow customers to tip runners.', true, 'financial', 'coins'),
    ('enable_wallet', 'Wallet Payments', 'Allow payment via Snackzo Wallet. Disable during wallet system maintenance.', true, 'financial', 'wallet'),
    
    -- 🚀 Growth & Marketing
    ('referral_system', 'Referral & Earn', 'Enable the referral program allowing users to invite friends for rewards.', true, 'growth', 'gift'),
    ('new_user_bonus', 'New User Sign-up Bonus', 'Automatically credit promotional balance to new users upon registration.', true, 'growth', 'sparkles'),
    
    -- 🛡️ Security & System
    ('maintenance_mode', 'System Maintenance Mode', 'Put the entire user-facing app into maintenance mode. Only admins can access.', false, 'system', 'construction'),
    ('guest_checkout', 'Guest Checkout', 'Allow users to purchase without creating an account (Data retention is lower).', false, 'security', 'ghost')

ON CONFLICT (feature_name) 
DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    icon_key = EXCLUDED.icon_key;
