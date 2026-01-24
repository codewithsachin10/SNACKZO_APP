-- ========================================
-- FIX NOTIFICATION TRIGGER FOR ORDER ISSUES
-- The trigger was using 'data' column but notifications table uses 'metadata'
-- ========================================

-- Drop the old trigger
DROP TRIGGER IF EXISTS on_issue_created ON public.order_issues;

-- Drop the old function
DROP FUNCTION IF EXISTS public.notify_issue_created();

-- Recreate the function with correct column name (metadata instead of data)
CREATE OR REPLACE FUNCTION public.notify_issue_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Notify admins about new issue
  INSERT INTO public.notifications (user_id, title, body, type, metadata)
  SELECT ur.user_id, 
         'New Customer Issue 🚨',
         'A customer reported: ' || COALESCE(NEW.category::TEXT, 'issue'),
         'order',
         jsonb_build_object('issue_id', NEW.id, 'order_id', NEW.order_id)
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If notification fails, don't block the ticket creation
  RAISE WARNING 'Failed to create admin notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_issue_created
  AFTER INSERT ON public.order_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_issue_created();

SELECT 'Notification trigger fixed!' as message;
