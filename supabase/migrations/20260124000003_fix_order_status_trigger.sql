-- Fix Order Status Trigger - Run this in Supabase SQL Editor
-- The issue is the trigger needs to bypass RLS to insert status history

-- Option 1: Make the trigger function run with SECURITY DEFINER (runs as owner, bypasses RLS)
CREATE OR REPLACE FUNCTION record_order_status_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Also fix the award_delivery_points function
CREATE OR REPLACE FUNCTION award_delivery_points()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    points_to_award INTEGER;
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        points_to_award := calculate_order_points(NEW.total);
        
        -- Update order with points earned
        UPDATE orders SET points_earned = points_to_award WHERE id = NEW.id;
        
        -- Add points to user profile (if loyalty_points column exists)
        UPDATE profiles 
        SET loyalty_points = COALESCE(loyalty_points, 0) + points_to_award
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN undefined_column THEN
        -- loyalty_points column doesn't exist, skip
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix update_runner_delivery_count function
CREATE OR REPLACE FUNCTION update_runner_delivery_count()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.runner_id IS NOT NULL THEN
        UPDATE runners 
        SET total_deliveries = COALESCE(total_deliveries, 0) + 1
        WHERE id = NEW.runner_id;
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN undefined_column THEN
        -- total_deliveries column doesn't exist, skip
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for runners to update orders (allow all authenticated users for now)
-- The runner dashboard has its own auth system, so we allow updates from authenticated users
DROP POLICY IF EXISTS "Runners can update order status" ON orders;
CREATE POLICY "Runners can update order status" ON orders
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- Allow service role and triggers to insert into order_status_history
DROP POLICY IF EXISTS "System can insert status history" ON order_status_history;
CREATE POLICY "System can insert status history" ON order_status_history
    FOR INSERT WITH CHECK (true);

SELECT 'Trigger fix applied!' as status;
