-- Create user_addresses table
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL, -- e.g., 'Home', 'Work', 'Other'
    house_no TEXT NOT NULL, -- Block / House No
    area TEXT NOT NULL, -- Apartment / Area
    directions TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

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

-- Create index for performance
CREATE INDEX IF NOT EXISTS user_addresses_user_id_idx ON public.user_addresses(user_id);
