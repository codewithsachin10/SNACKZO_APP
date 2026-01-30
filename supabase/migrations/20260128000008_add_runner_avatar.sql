-- Add avatar_url column to runners table
ALTER TABLE public.runners 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Allow public read access to this column (already covered by select policy, but good to be explicit mentally)
