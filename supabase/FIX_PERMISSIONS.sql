
-- Fix permissions for payment_sessions
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert (required for unauthenticated checkout)
CREATE POLICY "Allow public insert" ON public.payment_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anonymous users to read (required for checking status)
CREATE POLICY "Allow public read" ON public.payment_sessions
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anonymous users to update (required for mobile confirmation)
CREATE POLICY "Allow public update" ON public.payment_sessions
FOR UPDATE
TO anon, authenticated
USING (true);

-- Force grant
GRANT ALL ON public.payment_sessions TO anon;
GRANT ALL ON public.payment_sessions TO authenticated;
GRANT ALL ON public.payment_sessions TO service_role;
