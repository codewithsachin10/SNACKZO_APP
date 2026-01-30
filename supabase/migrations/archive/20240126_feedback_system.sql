-- Create Feedback Table
CREATE TABLE IF NOT EXISTS public.app_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    category TEXT NOT NULL CHECK (category IN ('food_quality', 'delivery', 'app_issue', 'feature_request', 'other')),
    message TEXT NOT NULL,
    related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    is_resolved BOOLEAN DEFAULT false,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for Users (Can Insert their own)
CREATE POLICY "Users can create feedback" 
ON public.app_feedback FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" 
ON public.app_feedback FOR SELECT 
USING (auth.uid() = user_id);

-- Ensure is_admin column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Policies for Admins (Can View/Update all)
CREATE POLICY "Admins can view all feedback" 
ON public.app_feedback FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
    OR
    auth.uid() = user_id
);

CREATE POLICY "Admins can update information" 
ON public.app_feedback FOR UPDATE 
USING (
   EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_feedback;

-- Notifications Trigger (Optional - notifies admins table?)
-- For now, just the table structure.

NOTIFY pgrst, 'reload schema';
