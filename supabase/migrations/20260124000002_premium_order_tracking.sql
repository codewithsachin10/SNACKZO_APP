-- Premium Order Tracking Database Migration
-- Run this in Supabase SQL Editor

-- ========================================
-- ORDER STATUS HISTORY TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    message TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id, created_at);

-- Trigger to auto-record status changes
CREATE OR REPLACE FUNCTION record_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status, message)
        VALUES (NEW.id, NEW.status, 
            CASE NEW.status
                WHEN 'placed' THEN 'Order has been placed successfully'
                WHEN 'preparing' THEN 'Your order is being prepared'
                WHEN 'packed' THEN 'Order is packed and ready'
                WHEN 'out_for_delivery' THEN 'Runner is on the way'
                WHEN 'nearby' THEN 'Runner is nearby your location'
                WHEN 'delivered' THEN 'Order delivered successfully'
                WHEN 'cancelled' THEN 'Order has been cancelled'
                ELSE 'Status updated'
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_record_order_status ON orders;
CREATE TRIGGER trigger_record_order_status
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION record_order_status_change();

-- ========================================
-- DELIVERY INSTRUCTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS delivery_instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    instructions TEXT,
    is_contactless BOOLEAN DEFAULT false,
    request_photo_proof BOOLEAN DEFAULT false,
    safe_drop_location TEXT,
    gate_code TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- DELIVERY PROOFS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS delivery_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    photo_url TEXT NOT NULL,
    signature_url TEXT,
    received_by TEXT,
    notes TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ORDER ISSUES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS order_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    issue_type TEXT CHECK (issue_type IN ('late', 'wrong', 'missing', 'damaged', 'quality', 'runner', 'other')),
    description TEXT,
    photo_urls TEXT[],
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    resolution TEXT,
    refund_amount DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_order_issues_order ON order_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_user ON order_issues(user_id);

-- ========================================
-- RUNNER TIPS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS runner_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    runner_id UUID REFERENCES runners(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runner_tips_runner ON runner_tips(runner_id);

-- ========================================
-- ORDER CHAT MESSAGES TABLE (Enhanced)
-- ========================================
-- Note: You may already have a chat table, this adds more features
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ========================================
-- DELIVERY ESTIMATES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS delivery_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
    estimated_pickup_at TIMESTAMP WITH TIME ZONE,
    estimated_delivery_at TIMESTAMP WITH TIME ZONE,
    actual_pickup_at TIMESTAMP WITH TIME ZONE,
    actual_delivery_at TIMESTAMP WITH TIME ZONE,
    distance_km DECIMAL(6, 2),
    route_polyline TEXT,
    traffic_level TEXT CHECK (traffic_level IN ('low', 'medium', 'high')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ADD NEW COLUMNS TO ORDERS TABLE
-- ========================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_contactless BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;

-- ========================================
-- ADD NEW COLUMNS TO RUNNERS TABLE
-- ========================================
ALTER TABLE runners ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE runners ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE runners ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE runners ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0;
ALTER TABLE runners ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE runners ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- FUNCTION: Calculate Points for Order
-- ========================================
CREATE OR REPLACE FUNCTION calculate_order_points(order_total DECIMAL)
RETURNS INTEGER AS $$
BEGIN
    -- 1 point per ₹10 spent
    RETURN FLOOR(order_total / 10);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- FUNCTION: Award Points on Delivery
-- ========================================
CREATE OR REPLACE FUNCTION award_delivery_points()
RETURNS TRIGGER AS $$
DECLARE
    points_to_award INTEGER;
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        points_to_award := calculate_order_points(NEW.total);
        
        -- Update order with points earned
        UPDATE orders SET points_earned = points_to_award WHERE id = NEW.id;
        
        -- Add points to user profile
        UPDATE profiles 
        SET loyalty_points = COALESCE(loyalty_points, 0) + points_to_award
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_award_delivery_points ON orders;
CREATE TRIGGER trigger_award_delivery_points
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION award_delivery_points();

-- ========================================
-- FUNCTION: Update Runner Delivery Count
-- ========================================
CREATE OR REPLACE FUNCTION update_runner_delivery_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.runner_id IS NOT NULL THEN
        UPDATE runners 
        SET total_deliveries = COALESCE(total_deliveries, 0) + 1
        WHERE id = NEW.runner_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_runner_deliveries ON orders;
CREATE TRIGGER trigger_update_runner_deliveries
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_runner_delivery_count();

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Order Status History
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their order status history" ON order_status_history;
CREATE POLICY "Users can view their order status history" ON order_status_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
    );

-- Delivery Instructions
ALTER TABLE delivery_instructions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their delivery instructions" ON delivery_instructions;
CREATE POLICY "Users can manage their delivery instructions" ON delivery_instructions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
    );

-- Delivery Proofs
ALTER TABLE delivery_proofs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their delivery proofs" ON delivery_proofs;
CREATE POLICY "Users can view their delivery proofs" ON delivery_proofs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
    );

-- Order Issues
ALTER TABLE order_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their order issues" ON order_issues;
CREATE POLICY "Users can manage their order issues" ON order_issues
    FOR ALL USING (auth.uid() = user_id);

-- Runner Tips
ALTER TABLE runner_tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their tips" ON runner_tips;
CREATE POLICY "Users can manage their tips" ON runner_tips
    FOR ALL USING (auth.uid() = user_id);

-- Delivery Estimates
ALTER TABLE delivery_estimates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their delivery estimates" ON delivery_estimates;
CREATE POLICY "Users can view their delivery estimates" ON delivery_estimates
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
    );

-- ========================================
-- GRANT PERMISSIONS
-- ========================================
GRANT EXECUTE ON FUNCTION calculate_order_points TO authenticated;

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================
-- Enable realtime for runner_locations
ALTER PUBLICATION supabase_realtime ADD TABLE runner_locations;

-- ========================================
-- DONE!
-- ========================================
SELECT 'Premium Order Tracking migration completed!' as status;
