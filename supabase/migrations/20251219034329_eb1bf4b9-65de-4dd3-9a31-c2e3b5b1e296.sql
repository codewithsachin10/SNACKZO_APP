-- Allow anyone to sign up as a runner (they'll be inactive until admin approves)
CREATE POLICY "Anyone can sign up as a runner"
ON public.runners
FOR INSERT
WITH CHECK (is_active = false);

-- Allow runners to view their own record by phone
CREATE POLICY "Runners can view their own record"
ON public.runners
FOR SELECT
USING (true);