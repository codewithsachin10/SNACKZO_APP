-- =====================================================
-- SEED DATA - 20 HOSTEL MART ITEMS
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Ensure Categories Exist
INSERT INTO public.categories (name, emoji, display_order) VALUES
('Snacks', '🍟', 1),
('Beverages', '🥤', 2),
('Maggi & Noodles', '🍜', 3),
('Chocolates', '🍫', 4),
('Essentials', '🧴', 5)
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Products
-- We use a DO block to look up category IDs dynamically
DO $$
DECLARE
  cat_snacks UUID;
  cat_drinks UUID;
  cat_noodles UUID;
  cat_choco UUID;
  cat_essentials UUID;
BEGIN
  -- Get Category IDs
  SELECT id INTO cat_snacks FROM public.categories WHERE name = 'Snacks';
  SELECT id INTO cat_drinks FROM public.categories WHERE name = 'Beverages';
  SELECT id INTO cat_noodles FROM public.categories WHERE name = 'Maggi & Noodles';
  SELECT id INTO cat_choco FROM public.categories WHERE name = 'Chocolates';
  SELECT id INTO cat_essentials FROM public.categories WHERE name = 'Essentials';

  -- Deleting existing products to avoid duplicates if run multiple times (Optional, safer for fresh seed)
  -- DELETE FROM public.products; 

  -- Insert Items
  INSERT INTO public.products (name, description, price, original_price, stock, is_available, category_id, image_url) VALUES
  
  -- MAGGI & NOODLES
  ('Maggi Masala Noodles', 'The classic late-night hostel savior. Hot & spicy.', 25.00, 30.00, 50, true, cat_noodles, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800&q=80'),
  ('Spicy Cup Noodles', 'Just add hot water! Perfect for quick hunger.', 60.00, 0, 30, true, cat_noodles, 'https://images.unsplash.com/photo-1543206497-6a1631566416?w=800&q=80'),
  ('Cheese Ramen', 'Korean style cheesy noodles.', 120.00, 150.00, 20, true, cat_noodles, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&q=80'),

  -- BEVERAGES
  ('Coca Cola (Can)', 'Chilled 330ml can of happiness.', 40.00, 0, 48, true, cat_drinks, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80'),
  ('Red Bull Energy Drink', 'For those all-nighter study sessions.', 125.00, 0, 24, true, cat_drinks, 'https://images.unsplash.com/photo-1551829142-d9b8cf2c918a?w=800&q=80'),
  ('Cold Coffee (Hazelnut)', 'Creamy rich cold coffee to wake you up.', 80.00, 99.00, 15, true, cat_drinks, 'https://images.unsplash.com/photo-1461023058943-48dbf1399f98?w=800&q=80'),
  ('Masala Chai (Flask)', 'Hot homemade tea, serves 2.', 50.00, 0, 10, true, cat_drinks, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80'),
  ('Mineral Water (1L)', 'Stay hydrated.', 20.00, 0, 100, true, cat_drinks, 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=800&q=80'),

  -- SNACKS
  ('Lays Classic Salted', 'Crispy potato chips, family pack.', 40.00, 0, 40, true, cat_snacks, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&q=80'),
  ('Spicy Nachos + Dip', 'Crunchy nachos with cheesy jalapeno dip.', 150.00, 180.00, 15, true, cat_snacks, 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=800&q=80'),
  ('Butter Popcorn', 'Movie night essential.', 60.00, 0, 25, true, cat_snacks, 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=800&q=80'),
  ('Club Sandwich', 'Grilled vegetable sandwich with mayo.', 90.00, 110.00, 10, true, cat_snacks, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80'),
  ('Oreo Biscuits', 'Milk''s favorite cookie.', 40.00, 0, 60, true, cat_snacks, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80'),

  -- CHOCOLATES
  ('Dairy Milk Silk', 'Smooth and creamy chocolate bar.', 80.00, 0, 30, true, cat_choco, 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800&q=80'),
  ('KitKat Chunky', 'Have a break.', 40.00, 0, 45, true, cat_choco, 'https://images.unsplash.com/photo-1528644588729-ea224f80211d?w=800&q=80'),
  ('Snickers Bar', 'Hungry? Grab a Snickers.', 35.00, 0, 50, true, cat_choco, 'https://images.unsplash.com/photo-1582126207085-3004bb431c20?w=800&q=80'),
  ('Dark Chocolate (70%)', 'Rich dark chocolate for connoisseurs.', 120.00, 150.00, 20, true, cat_choco, 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=800&q=80'),

  -- ESSENTIALS
  ('Toothpaste & Brush Kit', 'Travel size dental kit.', 85.00, 0, 20, true, cat_essentials, 'https://images.unsplash.com/photo-1559670603-172b50d7a18e?w=800&q=80'),
  ('Mosquito Repellent', 'Keep the bugs away.', 55.00, 0, 30, true, cat_essentials, 'https://images.unsplash.com/photo-1629210648417-6979213bc57a?w=800&q=80'),
  ('A4 Notebook & Pen', 'For those last-minute assignments.', 60.00, 75.00, 40, true, cat_essentials, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80');

END $$;

SELECT 'Successfully added 20 items!' as result;
