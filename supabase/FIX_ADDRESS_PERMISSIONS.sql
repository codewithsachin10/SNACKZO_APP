-- Grant permissions to authenticated users and service role
GRANT ALL ON TABLE public.user_addresses TO authenticated;
GRANT ALL ON TABLE public.user_addresses TO service_role;

-- Enable RLS (idempotent)
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.user_addresses;

-- Recreate policies
CREATE POLICY "Users can view their own addresses"
    ON public.user_addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
    ON public.user_addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
    ON public.user_addresses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
    ON public.user_addresses FOR DELETE
    USING (auth.uid() = user_id);

-- Ensure index exists
CREATE INDEX IF NOT EXISTS user_addresses_user_id_idx ON public.user_addresses(user_id);
