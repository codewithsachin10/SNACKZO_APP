-- ==========================================
-- FINAL SETUP SCRIPT FOR NOTIFICATIONS & TABLES
-- Run this entire script in your Supabase SQL Editor
-- ==========================================

-- 1. Create store_config table if not exists
create table if not exists public.store_config (
  id uuid default gen_random_uuid() primary key,
  is_open boolean default true,
  open_time text default '09:00',
  close_time text default '22:00',
  announcement_text text,
  promo_text text,
  last_updated timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure at least one row exists
insert into public.store_config (is_open)
select true where not exists (select 1 from public.store_config);

-- 2. Create notifications table if not exists
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text not null,
  type text default 'info',
  target_user_id uuid references auth.users(id) on delete cascade, -- NULL means broadcast
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create push_subscriptions table IF NOT EXISTS (Crucial for Push)
create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_used_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable RLS on all tables
alter table public.store_config enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- 5. Drop existing policies to prevent conflicts
drop policy if exists "Public Read Config" on public.store_config;
drop policy if exists "Admin Update Config" on public.store_config;
drop policy if exists "Users view own notifications" on public.notifications;
drop policy if exists "Users read broadcast notifications" on public.notifications;
drop policy if exists "Admin insert notifications" on public.notifications;
drop policy if exists "Users can view own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can insert own subscriptions" on public.push_subscriptions;
drop policy if exists "Users can update own subscriptions" on public.push_subscriptions;
drop policy if exists "Admins can view all subscriptions" on public.push_subscriptions;

-- 6. Create RLS Policies

-- Store Config
create policy "Public Read Config"
  on public.store_config for select
  to anon, authenticated
  using (true);

create policy "Admin Update Config"
  on public.store_config for update
  using (true); -- Simplified for development, ideally check admin role

-- Notifications
create policy "Users view own notifications"
  on public.notifications for select
  using (auth.uid() = target_user_id or target_user_id is null);

create policy "Admin insert notifications"
  on public.notifications for insert
  with check (true); -- Simplified

-- Push Subscriptions
create policy "Users can view own subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

-- 7. GRANT PERMISSIONS (Fixes 403 Errors)
grant usage on schema public to postgres, anon, authenticated, service_role;

grant all privileges on all tables in schema public to postgres, service_role;
grant select, insert, update on public.store_config to anon, authenticated;
grant select, insert, update on public.notifications to anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to anon, authenticated;

-- Confirmation
select 'Setup Completed Successfully' as status;
