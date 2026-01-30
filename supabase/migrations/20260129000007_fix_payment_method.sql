-- FIX: Update RPC to Save Payment Method
-- Now accepts 'p_method' so we can see 'UPI', 'Card', etc. in the Admin Panel.

-- Drop the old version to avoid ambiguity
DROP FUNCTION IF EXISTS public.complete_payment_session(UUID, TEXT);

-- Create new version with 'p_method'
CREATE OR REPLACE FUNCTION public.complete_payment_session(
    p_session_id UUID,
    p_status TEXT,
    p_method TEXT DEFAULT 'unknown' -- Default allows backward compatibility
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.payment_sessions
    SET 
        status = p_status,
        payment_method_type = p_method, -- Save the method
        updated_at = now()
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION public.complete_payment_session(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
