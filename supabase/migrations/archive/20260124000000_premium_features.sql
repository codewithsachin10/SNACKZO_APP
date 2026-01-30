-- Premium Features Database Migration
-- Run this in Supabase SQL Editor

-- ========================================
-- FEATURE TOGGLES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS feature_toggles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    icon TEXT,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default features
INSERT INTO feature_toggles (feature_name, display_name, description, icon, category, is_enabled) VALUES
    ('flash_deals', 'Flash Deals & Coupons', 'Time-limited offers and promotional codes for customers', 'flash_deals', 'promotions', true),
    ('price_alerts', 'Price Drop Alerts', 'Allow customers to set alerts for price drops on products', 'price_alerts', 'engagement', true),
    ('spin_wheel', 'Spin-the-Wheel Rewards', 'Daily spin game for customers to win points and discounts', 'spin_wheel', 'gamification', true)
ON CONFLICT (feature_name) DO NOTHING;

-- ========================================
-- PRODUCT IMAGES TABLE (Multiple images per product)
-- ========================================
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

-- ========================================
-- SEARCH HISTORY TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);

-- ========================================
-- RECURRING ORDER TEMPLATES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS recurring_order_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
    preferred_day INTEGER, -- 0-6 for day of week, 1-31 for day of month
    preferred_time TIME,
    delivery_address TEXT,
    is_active BOOLEAN DEFAULT true,
    next_scheduled_at TIMESTAMP WITH TIME ZONE,
    last_ordered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES recurring_order_templates(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1
);

-- ========================================
-- RUNNER LOCATIONS TABLE (Real-time tracking)
-- ========================================
CREATE TABLE IF NOT EXISTS runner_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    runner_id UUID REFERENCES runners(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    heading DECIMAL(5, 2),
    speed DECIMAL(5, 2),
    accuracy DECIMAL(6, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runner_locations_runner ON runner_locations(runner_id);
CREATE INDEX IF NOT EXISTS idx_runner_locations_updated ON runner_locations(updated_at);

-- Function to cleanup old runner locations (keep last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_runner_locations()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM runner_locations 
    WHERE updated_at < NOW() - INTERVAL '24 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-cleanup
DROP TRIGGER IF EXISTS trigger_cleanup_runner_locations ON runner_locations;
CREATE TRIGGER trigger_cleanup_runner_locations
AFTER INSERT ON runner_locations
EXECUTE FUNCTION cleanup_old_runner_locations();

-- ========================================
-- ORDER PAYMENTS TABLE (Split payments)
-- ========================================
CREATE TABLE IF NOT EXISTS order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    payment_type TEXT CHECK (payment_type IN ('wallet', 'loyalty_points', 'upi', 'card', 'cod')),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order ON order_payments(order_id);

-- ========================================
-- FLASH DEALS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS flash_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_value DECIMAL(10, 2) DEFAULT 0,
    max_discount DECIMAL(10, 2),
    product_ids UUID[],
    category_ids UUID[],
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    promo_code TEXT UNIQUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flash_deals_active ON flash_deals(is_active, starts_at, ends_at);

-- Flash deal claims
CREATE TABLE IF NOT EXISTS flash_deal_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES flash_deals(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    order_id UUID REFERENCES orders(id),
    UNIQUE(user_id, deal_id)
);

-- ========================================
-- PRICE ALERTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    target_price DECIMAL(10, 2) NOT NULL,
    is_triggered BOOLEAN DEFAULT false,
    triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_product ON price_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);

-- Price history for charts
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, changed_at);

-- Trigger to record price changes
CREATE OR REPLACE FUNCTION record_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.price != NEW.price THEN
        INSERT INTO price_history (product_id, price)
        VALUES (NEW.id, NEW.price);
        
        -- Check and trigger price alerts
        UPDATE price_alerts
        SET is_triggered = true, triggered_at = NOW()
        WHERE product_id = NEW.id 
          AND target_price >= NEW.price 
          AND is_triggered = false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_record_price_change ON products;
CREATE TRIGGER trigger_record_price_change
AFTER UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION record_price_change();

-- ========================================
-- SPIN WHEEL TABLES
-- ========================================
CREATE TABLE IF NOT EXISTS spin_wheel_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    type TEXT CHECK (type IN ('points', 'discount_percent', 'discount_fixed', 'free_delivery', 'nothing')),
    color TEXT DEFAULT '#FF6B6B',
    probability DECIMAL(5, 2) DEFAULT 10,
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default segments
INSERT INTO spin_wheel_segments (label, value, type, color, probability, position, is_active) VALUES
    ('50 Points', 50, 'points', '#FF6B6B', 30, 0, true),
    ('10% OFF', 10, 'discount_percent', '#4ECDC4', 15, 1, true),
    ('100 Points', 100, 'points', '#45B7D1', 20, 2, true),
    ('Free Delivery', 0, 'free_delivery', '#96CEB4', 10, 3, true),
    ('Try Again', 0, 'nothing', '#FFEAA7', 20, 4, true),
    ('₹20 OFF', 20, 'discount_fixed', '#DDA0DD', 5, 5, true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS spin_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES spin_wheel_segments(id),
    reward_type TEXT,
    reward_value DECIMAL(10, 2),
    discount_code TEXT,
    is_claimed BOOLEAN DEFAULT false,
    spun_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spin_history_user ON spin_history(user_id, spun_at);

-- Function to check if user can spin
CREATE OR REPLACE FUNCTION can_user_spin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    last_spin TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT spun_at INTO last_spin
    FROM spin_history
    WHERE user_id = p_user_id
    ORDER BY spun_at DESC
    LIMIT 1;
    
    IF last_spin IS NULL THEN
        RETURN true;
    END IF;
    
    RETURN (NOW() - last_spin) > INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to perform spin
CREATE OR REPLACE FUNCTION perform_spin(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    selected_segment spin_wheel_segments%ROWTYPE;
    rand_val DECIMAL;
    cumulative DECIMAL := 0;
    total_prob DECIMAL;
    discount_code TEXT;
    result JSON;
BEGIN
    -- Check if user can spin
    IF NOT can_user_spin(p_user_id) THEN
        RETURN json_build_object('error', 'Cannot spin yet');
    END IF;
    
    -- Get total probability
    SELECT SUM(probability) INTO total_prob FROM spin_wheel_segments WHERE is_active = true;
    
    -- Generate random number
    rand_val := random() * total_prob;
    
    -- Select segment based on probability
    FOR selected_segment IN 
        SELECT * FROM spin_wheel_segments WHERE is_active = true ORDER BY position
    LOOP
        cumulative := cumulative + selected_segment.probability;
        IF rand_val <= cumulative THEN
            EXIT;
        END IF;
    END LOOP;
    
    -- Generate discount code if applicable
    IF selected_segment.type IN ('discount_percent', 'discount_fixed') THEN
        discount_code := 'SPIN' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
    END IF;
    
    -- Record the spin
    INSERT INTO spin_history (user_id, segment_id, reward_type, reward_value, discount_code)
    VALUES (p_user_id, selected_segment.id, selected_segment.type, selected_segment.value, discount_code);
    
    -- If points, add to user wallet
    IF selected_segment.type = 'points' THEN
        UPDATE profiles
        SET loyalty_points = COALESCE(loyalty_points, 0) + selected_segment.value::INTEGER
        WHERE id = p_user_id;
    END IF;
    
    RETURN json_build_object(
        'segment_id', selected_segment.id,
        'label', selected_segment.label,
        'reward_type', selected_segment.type,
        'reward_value', selected_segment.value,
        'discount_code', discount_code
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SHARED CONTENT TABLE (Social Sharing)
-- ========================================
CREATE TABLE IF NOT EXISTS shared_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT CHECK (content_type IN ('product', 'referral', 'achievement')),
    content_id TEXT,
    platform TEXT,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER SPENDING STATS VIEW
-- ========================================
CREATE OR REPLACE VIEW user_spending_stats AS
SELECT 
    user_id,
    COUNT(*) as total_orders,
    SUM(total) as total_spent,
    AVG(total) as avg_order_value,
    MAX(created_at) as last_order_date
FROM orders
WHERE status = 'delivered'
GROUP BY user_id;

-- Function to get spending analytics
CREATE OR REPLACE FUNCTION get_spending_analytics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_orders', COALESCE(total_orders, 0),
        'total_spent', COALESCE(total_spent, 0),
        'avg_order_value', COALESCE(avg_order_value, 0),
        'last_order_date', last_order_date
    ) INTO result
    FROM user_spending_stats
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(result, json_build_object(
        'total_orders', 0,
        'total_spent', 0,
        'avg_order_value', 0,
        'last_order_date', NULL
    ));
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Feature toggles (read by anyone, write by admin)
ALTER TABLE feature_toggles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read feature toggles" ON feature_toggles;
CREATE POLICY "Anyone can read feature toggles" ON feature_toggles FOR SELECT USING (true);

-- Search history (users can only see their own)
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own search history" ON search_history;
CREATE POLICY "Users can manage their own search history" ON search_history 
    FOR ALL USING (auth.uid() = user_id);

-- Recurring orders (users can only see their own)
ALTER TABLE recurring_order_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own recurring orders" ON recurring_order_templates;
CREATE POLICY "Users can manage their own recurring orders" ON recurring_order_templates 
    FOR ALL USING (auth.uid() = user_id);

-- Price alerts (users can only see their own)
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own price alerts" ON price_alerts;
CREATE POLICY "Users can manage their own price alerts" ON price_alerts 
    FOR ALL USING (auth.uid() = user_id);

-- Spin history (users can only see their own)
ALTER TABLE spin_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own spin history" ON spin_history;
CREATE POLICY "Users can view their own spin history" ON spin_history 
    FOR SELECT USING (auth.uid() = user_id);

-- Flash deal claims (users can only see their own)
ALTER TABLE flash_deal_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own deal claims" ON flash_deal_claims;
CREATE POLICY "Users can manage their own deal claims" ON flash_deal_claims 
    FOR ALL USING (auth.uid() = user_id);

-- Flash deals (anyone can read active deals)
ALTER TABLE flash_deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active flash deals" ON flash_deals;
CREATE POLICY "Anyone can read active flash deals" ON flash_deals 
    FOR SELECT USING (is_active = true AND NOW() BETWEEN starts_at AND ends_at);

-- Spin wheel segments (anyone can read active segments)
ALTER TABLE spin_wheel_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active spin segments" ON spin_wheel_segments;
CREATE POLICY "Anyone can read active spin segments" ON spin_wheel_segments 
    FOR SELECT USING (is_active = true);

-- Runner locations (anyone can read for tracking)
ALTER TABLE runner_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read runner locations" ON runner_locations;
CREATE POLICY "Anyone can read runner locations" ON runner_locations FOR SELECT USING (true);

-- Product images (anyone can read)
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read product images" ON product_images;
CREATE POLICY "Anyone can read product images" ON product_images FOR SELECT USING (true);

-- Price history (anyone can read)
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read price history" ON price_history;
CREATE POLICY "Anyone can read price history" ON price_history FOR SELECT USING (true);

-- ========================================
-- HELPER FUNCTION: Check if feature is enabled
-- ========================================
CREATE OR REPLACE FUNCTION is_feature_enabled(p_feature_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT is_enabled FROM feature_toggles WHERE feature_name = p_feature_name);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- HELPER FUNCTION: Get active flash deals
-- ========================================
CREATE OR REPLACE FUNCTION get_active_flash_deals()
RETURNS SETOF flash_deals AS $$
BEGIN
    IF is_feature_enabled('flash_deals') THEN
        RETURN QUERY
        SELECT * FROM flash_deals
        WHERE is_active = true
          AND NOW() BETWEEN starts_at AND ends_at
        ORDER BY discount_value DESC;
    END IF;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_user_spin TO authenticated;
GRANT EXECUTE ON FUNCTION perform_spin TO authenticated;
GRANT EXECUTE ON FUNCTION get_spending_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION is_feature_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_flash_deals TO authenticated;

-- ========================================
-- DONE!
-- ========================================
SELECT 'Premium features migration completed successfully!' as status;
