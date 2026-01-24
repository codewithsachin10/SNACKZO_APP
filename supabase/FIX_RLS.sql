-- Make Profiles Publicly Readable (so users can see names in groups)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Ensure Group Items are visible
DROP POLICY IF EXISTS "Anyone can view items" ON public.group_order_items;
CREATE POLICY "Anyone can view items" 
ON public.group_order_items FOR SELECT 
USING (true);

-- Ensure Group Members are visible
DROP POLICY IF EXISTS "Anyone can view members" ON public.group_order_members;
CREATE POLICY "Anyone can view members" 
ON public.group_order_members FOR SELECT 
USING (true);
