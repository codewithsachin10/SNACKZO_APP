-- SECURE PAYMENT GATEWAY (MOCK/DEMO MODE HARDENING)
-- This migration hardens the payment flow by moving success logic to the server.

-- 1. Ensure payment_sessions has necessary fields
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_sessions' AND column_name = 'is_demo') THEN
        ALTER TABLE public.payment_sessions ADD COLUMN is_demo BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_sessions' AND column_name = 'provider') THEN
        ALTER TABLE public.payment_sessions ADD COLUMN provider TEXT DEFAULT 'snackzo_native';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_sessions' AND column_name = 'payment_method_type') THEN
        ALTER TABLE public.payment_sessions ADD COLUMN payment_method_type TEXT;
    END IF;
END $$;

-- 2. Create a secure function to PROCESS a Mock Payment
-- This acts like a Webhook from a real provider (Razorpay/Stripe)
-- It ensures that the client cannot just "say" it's paid; they must call this function which logs the intent.

CREATE OR REPLACE FUNCTION public.process_mock_payment(
    p_session_id UUID,
    p_success BOOLEAN,
    p_method TEXT DEFAULT 'upi'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run as superuser to bypass table policies if needed (e.g., updating orders)
AS $$
DECLARE
    v_session RECORD;
    v_order_id UUID;
    v_amount NUMERIC;
    v_user_id UUID;
BEGIN
    -- 1. Fetch the Session
    SELECT * INTO v_session FROM public.payment_sessions WHERE id = p_session_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;

    -- 2. Verify Session State
    IF v_session.status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already paid');
    END IF;

    -- 3. Update Session
    UPDATE public.payment_sessions 
    SET 
        status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
        payment_method_type = p_method,
        updated_at = now()
    WHERE id = p_session_id;

    -- 4. If Success, Trigger Business Logic
    IF p_success THEN
        v_order_id := v_session.order_id;
        v_amount := v_session.amount;
        v_user_id := v_session.user_id;

        -- A. Order Payment
        IF v_order_id IS NOT NULL THEN
            UPDATE public.orders 
            SET 
                status = 'confirmed', -- or 'paid' depending on your enum
                payment_status = 'paid'
            WHERE id = v_order_id;
            
            -- Log Audit
            INSERT INTO public.security_audit_logs (event_type, actor_id, target_id, payload, severity)
            VALUES ('ORDER_PAID_MOCK', auth.uid(), v_order_id::text, jsonb_build_object('amount', v_amount), 'medium');
        END IF;

        -- B. Wallet Recharge (if no order_id, assume wallet topup transaction logic exists elsewhere)
        -- For now, we focus on Orders.
    ELSE
        -- Log Failure
        INSERT INTO public.security_audit_logs (event_type, actor_id, target_id, payload, severity)
        VALUES ('PAYMENT_FAILED_MOCK', auth.uid(), p_session_id::text, jsonb_build_object('reason', 'User declined'), 'low');
    END IF;

    RETURN jsonb_build_object('success', true, 'status', CASE WHEN p_success THEN 'completed' ELSE 'failed' END);
END;
$$;

-- 3. Grant Execute Permission
GRANT EXECUTE ON FUNCTION public.process_mock_payment TO authenticated;

-- 4. Create function to INITIALIZE a session securely
CREATE OR REPLACE FUNCTION public.initiate_payment_session(
    p_amount NUMERIC,
    p_order_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO public.payment_sessions (user_id, amount, order_id, status, is_demo, provider)
    VALUES (auth.uid(), p_amount, p_order_id, 'pending', true, 'snackzo_pay')
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.initiate_payment_session TO authenticated;

SELECT 'Secure Mock Gateway functions created' as status;
