-- SECURITY HARDENING SCRIPT (OWASP BEST PRACTICES)
-- Run this in your Supabase SQL Editor to secure your database.

-- =================================================================
-- 1. RATE LIMITING (Bot Protection)
-- =================================================================
-- Prevents users from spamming orders (DoS protection)
-- Limit: Max 3 orders per minute per user.
CREATE OR REPLACE FUNCTION check_order_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) 
    FROM orders 
    WHERE user_id = auth.uid() 
    AND created_at > (now() - interval '1 minute')
  ) >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded: You are placing orders too fast. Please wait a minute.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_rate_limit_orders ON orders;
CREATE TRIGGER tr_rate_limit_orders
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_order_rate_limit();


-- =================================================================
-- 2. STRICT INPUT VALIDATION (Data Integrity)
-- =================================================================
-- Ensure constraints on sensitive fields.

-- A. Phone Number Length Security
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS check_phone_length;

ALTER TABLE public.profiles 
  ADD CONSTRAINT check_phone_length 
  CHECK (phone IS NULL OR length(phone) >= 10);

-- B. Order Amount Validation (No negative payments)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS check_positive_payment;

ALTER TABLE public.orders
  ADD CONSTRAINT check_positive_payment
  CHECK (total >= 0);

-- =================================================================
-- 3. SANITIZATION (XSS Protection)
-- =================================================================
-- Automatically clean input fields to remove potential scripts or spaces.

CREATE OR REPLACE FUNCTION sanitize_profile_inputs()
RETURNS TRIGGER AS $$
BEGIN
  -- Trim strict whitespace
  NEW.full_name := trim(NEW.full_name);
  NEW.hostel_block := trim(NEW.hostel_block);
  
  -- Basic XSS Filter: Remove <script> tags from names using Regex
  -- (React handles this mostly, but this is defense-in-depth)
  NEW.full_name := regexp_replace(NEW.full_name, '<[^>]+>', '', 'g');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sanitize_profile ON profiles;
CREATE TRIGGER tr_sanitize_profile
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_profile_inputs();
