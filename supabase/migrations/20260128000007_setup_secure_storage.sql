-- ==============================================================================
-- SNACKZO STORAGE ARCHITECTURE (MVP)
-- ==============================================================================
-- This migration sets up secure storage buckets for product images and banners.
-- It implements Role-Based Access Control (RBAC) via Supabase Storage RLS.

-- 1. Create the 'public-assets' bucket
--    Used for: Products, Categories, Public Banners
--    Visibility: Public
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-assets', 
  'public-assets', 
  true, 
  5242880, -- 5MB limit
  '{image/png, image/jpeg, image/webp, image/gif}'
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = '{image/png, image/jpeg, image/webp, image/gif}';

-- 2. Enable RLS on storage.objects (Best Practice)
-- Skipped: RLS is already enabled by default on Supabase Storage.
-- alter table storage.objects enable row level security;

-- ==============================================================================
-- SECURITY POLICIES (RLS)
-- ==============================================================================

-- POLICY 1: Public Read Access
-- Everyone (even guests) can view images in the public-assets bucket
create policy "Public Access to Assets"
on storage.objects for select
using ( bucket_id = 'public-assets' );

-- POLICY 2: Admin Upload Access
-- Only Admins can upload new files to public-assets
create policy "Admins Can Upload Assets"
on storage.objects for insert
with check (
  bucket_id = 'public-assets' 
  and (
    select count(*) from public.user_roles 
    where user_id = auth.uid() 
    and role = 'admin'
  ) > 0
);

-- POLICY 3: Admin Update Access
-- Only Admins can update/replace files
create policy "Admins Can Update Assets"
on storage.objects for update
using (
  bucket_id = 'public-assets' 
  and (
    select count(*) from public.user_roles 
    where user_id = auth.uid() 
    and role = 'admin'
  ) > 0
);

-- POLICY 4: Admin Delete Access
-- Only Admins can delete files
create policy "Admins Can Delete Assets"
on storage.objects for delete
using (
  bucket_id = 'public-assets' 
  and (
    select count(*) from public.user_roles 
    where user_id = auth.uid() 
    and role = 'admin'
  ) > 0
);

-- ==============================================================================
-- FOLDERS & ORGANIZATION (Optional Helper)
-- ==============================================================================
-- While folders are virtual in object storage, we recommend this convention:
-- public-assets/products/{id}.webp
-- public-assets/banners/{id}.webp
-- public-assets/categories/{id}.webp
