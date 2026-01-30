-- SNACKZO MAXIMUM SECURITY - PHASE 3: ACTIVE DEFENSE
-- This migration implements Audit Triggers and Rate Limiting Logic

-- 1. CREATE AUDIT LOGGING FUNCTION
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS TRIGGER AS $$
DECLARE
    actor_id UUID := auth.uid();
    target_id TEXT;
    payload JSONB;
    event_type TEXT;
BEGIN
    -- Determine target_id and event_type based on the table
    IF TG_TABLE_NAME = 'wallet_transactions' THEN
        target_id := NEW.user_id::TEXT;
        payload := jsonb_build_object(
            'amount', NEW.amount,
            'type', NEW.transaction_type,
            'reason', NEW.description
        );
        event_type := 'WALLET_TRANSACTION';
    ELSIF TG_TABLE_NAME = 'orders' THEN
        target_id := NEW.id::TEXT;
        payload := jsonb_build_object(
            'old_status', OLD.status,
            'new_status', NEW.status
        );
        event_type := 'ORDER_STATUS_UPDATE';
    ELSIF TG_TABLE_NAME = 'user_roles' THEN
        target_id := NEW.user_id::TEXT;
        payload := jsonb_build_object(
            'role', NEW.role
        );
        event_type := 'ROLE_CHANGE';
    ELSIF TG_TABLE_NAME = 'profiles' THEN
        target_id := NEW.user_id::TEXT;
        payload := jsonb_build_object(
            'old_balance', OLD.wallet_balance,
            'new_balance', NEW.wallet_balance,
            'reason', 'Profile update'
        );
        event_type := 'BALANCE_ADJUSTMENT';
    END IF;

    INSERT INTO public.security_audit_logs (event_type, actor_id, target_id, payload, severity)
    VALUES (event_type, actor_id, target_id, payload, 'medium');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ATTACH AUDIT TRIGGERS
DROP TRIGGER IF EXISTS tr_audit_wallet ON public.wallet_transactions;
CREATE TRIGGER tr_audit_wallet
    AFTER INSERT ON public.wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION public.log_security_event();

DROP TRIGGER IF EXISTS tr_audit_orders ON public.orders;
CREATE TRIGGER tr_audit_orders
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_security_event();

DROP TRIGGER IF EXISTS tr_audit_roles ON public.user_roles;
CREATE TRIGGER tr_audit_roles
    AFTER INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.log_security_event();

DROP TRIGGER IF EXISTS tr_audit_profiles_balance ON public.profiles;
CREATE TRIGGER tr_audit_profiles_balance
    AFTER UPDATE OF wallet_balance ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_security_event();

-- 3. RATE LIMITING LOGIC
-- Function to be called from Edge Functions or Frontend to check/update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_max_attempts INT,
    p_window_minutes INT,
    p_block_minutes INT
)
RETURNS JSONB AS $$
DECLARE
    r_record RECORD;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT * INTO r_record FROM public.rate_limit_tracking WHERE key = p_key;

    IF r_record IS NULL THEN
        INSERT INTO public.rate_limit_tracking (key, attempts, last_attempt)
        VALUES (p_key, 1, v_now);
        RETURN jsonb_build_object('allowed', true, 'remaining', p_max_attempts - 1);
    END IF;

    -- If currently blocked
    IF r_record.blocked_until IS NOT NULL AND r_record.blocked_until > v_now THEN
        RETURN jsonb_build_object(
            'allowed', false, 
            'blocked_until', r_record.blocked_until, 
            'reason', 'Current block active'
        );
    END IF;

    -- Reset attempts if window passed
    IF r_record.last_attempt < v_now - (p_window_minutes * INTERVAL '1 minute') THEN
        UPDATE public.rate_limit_tracking 
        SET attempts = 1, last_attempt = v_now, blocked_until = NULL
        WHERE key = p_key;
        RETURN jsonb_build_object('allowed', true, 'remaining', p_max_attempts - 1);
    END IF;

    -- Increment attempts
    IF r_record.attempts < p_max_attempts THEN
        UPDATE public.rate_limit_tracking 
        SET attempts = attempts + 1, last_attempt = v_now
        WHERE key = p_key;
        RETURN jsonb_build_object('allowed', true, 'remaining', p_max_attempts - (r_record.attempts + 1));
    ELSE
        -- Reach limit, block them
        UPDATE public.rate_limit_tracking 
        SET blocked_until = v_now + (p_block_minutes * INTERVAL '1 minute'),
            last_attempt = v_now
        WHERE key = p_key;
        RETURN jsonb_build_object(
            'allowed', false, 
            'blocked_until', v_now + (p_block_minutes * INTERVAL '1 minute'),
            'reason', 'Max attempts reached'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CLEANUP OLD LOGS (Auto-housekeeping)
CREATE OR REPLACE FUNCTION public.cleanup_security_logs()
RETURNS void AS $$
BEGIN
    -- Keep logs for 90 days
    DELETE FROM public.security_audit_logs WHERE created_at < now() - INTERVAL '90 days';
    -- Keep tracking for 7 days
    DELETE FROM public.rate_limit_tracking WHERE last_attempt < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. GRANTS
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO anon, authenticated;

SELECT 'Active Defense (Logging & Rate Limiting) Applied Successfully' as status;
