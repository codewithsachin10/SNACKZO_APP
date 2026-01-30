
-- 1. Add attachment_url column to support_messages
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS attachment_url text;

-- 2. Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies (simplified for ensuring functionality)
-- Allow anyone to read attachments (public bucket)
DROP POLICY IF EXISTS "Public View Attachments" ON storage.objects;
CREATE POLICY "Public View Attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'support-attachments');

-- Allow authenticated users to upload to this bucket
DROP POLICY IF EXISTS "Authenticated Upload Attachments" ON storage.objects;
CREATE POLICY "Authenticated Upload Attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'support-attachments' AND auth.role() = 'authenticated');
