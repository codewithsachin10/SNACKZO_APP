-- Create a trigger that calls the 'send-welcome-email' Edge Function whenever a new user is created in auth.users

-- 1. Enable pg_net extension if not already (required for http calls from DB)
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Create the Trigger Function
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Call the Edge Function via pg_net (asynchronous)
  -- Replace PROJECT_REF with your actual project ref 'tvmlgdgdpbntyehpinps'
  PERFORM net.http_post(
    url := 'https://tvmlgdgdpbntyehpinps.supabase.co/functions/v1/send-welcome-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer Valuethatisignoredbyfunctionbutgoodpractice"}'::jsonb,
    body := jsonb_build_object('record', row_to_json(NEW))
  );
  
  RETURN NEW;
END;
$$;

-- 3. Create the Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_welcome ON auth.users;
CREATE TRIGGER on_auth_user_created_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_welcome_email();
