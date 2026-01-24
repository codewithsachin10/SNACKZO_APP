-- =====================================================
-- SEED DATA - 15 STATIONARY ITEMS
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Ensure Stationary Category Exists
INSERT INTO public.categories (name, emoji, display_order) VALUES
('Stationary', '✏️', 6)
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Products
DO $$
DECLARE
  cat_stationary UUID;
BEGIN
  -- Get Category ID for Stationary
  SELECT id INTO cat_stationary FROM public.categories WHERE name = 'Stationary';

  -- Insert 15 Stationary Items
  INSERT INTO public.products (name, description, price, original_price, stock, is_available, category_id, image_url) VALUES
  
  -- Writing Instruments
  ('Blue Ballpoint Pens (Pack of 5)', 'Smooth writing pens for daily notes.', 50.00, 60.00, 100, true, cat_stationary, 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=800&q=80'),
  ('Black Gel Pens (Set of 3)', 'Premium gel ink for exams.', 90.00, 0, 50, true, cat_stationary, 'https://images.unsplash.com/photo-1565538420870-da585d8b8a3e?w=800&q=80'),
  ('Mechanical Pencil 0.7mm', 'Precise writing, includes lead refill.', 45.00, 0, 40, true, cat_stationary, 'https://images.unsplash.com/photo-1595062584313-47018e0ee5cb?w=800&q=80'),
  ('Highlighter Set (Neon)', 'Mark important notes. Yellow, Green, Pink.', 80.00, 100.00, 30, true, cat_stationary, 'https://images.unsplash.com/photo-1598522695551-d446955be61b?w=800&q=80'),
  ('Permanent Marker (Black)', 'For labeling and project work.', 25.00, 0, 60, true, cat_stationary, 'https://images.unsplash.com/photo-1588619461332-44563a65492d?w=800&q=80'),

  -- Paper & Notebooks
  ('Spiral Notebook (A4, 200 Pages)', 'Ruled pages, durable cover.', 120.00, 150.00, 40, true, cat_stationary, 'https://images.unsplash.com/photo-1531346878377-a513bc95f30f?w=800&q=80'),
  ('Pocket Diary', 'Small notepad for quick ideas.', 40.00, 0, 50, true, cat_stationary, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80'),
  ('Sticky Notes (Post-it)', 'Reminders and bookmarks. 100 sheets.', 60.00, 0, 70, true, cat_stationary, 'https://images.unsplash.com/photo-1586075010923-2dd45eeed8bd?w=800&q=80'),
  ('A4 Printer Paper (50 Sheets)', 'Bright white paper for assignments.', 50.00, 0, 100, true, cat_stationary, 'https://images.unsplash.com/photo-1586075010923-2dd45eeed8bd?w=800&q=80'),
  ('Graph Paper Pad', 'Essential for math and engineering.', 30.00, 0, 30, true, cat_stationary, 'https://images.unsplash.com/photo-1627932681585-6bb9a25b348d?w=800&q=80'),

  -- Tools & Accessories
  ('Correction Tape (Whitener)', 'Fix mistakes instantly and neatly.', 40.00, 0, 40, true, cat_stationary, 'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=800&q=80'),
  ('Stapler with Pins', 'Compact stapler for binding reports.', 95.00, 120.00, 25, true, cat_stationary, 'https://images.unsplash.com/photo-1624622114251-872cb0484729?w=800&q=80'),
  ('Geometry Box', 'Compasses, ruler, protractor set.', 150.00, 180.00, 20, true, cat_stationary, 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=800&q=80'),
  ('Paper Clips & Binder Clips', 'Assorted sizes for organizing papers.', 45.00, 0, 50, true, cat_stationary, 'https://images.unsplash.com/photo-1586075010923-2dd45eeed8bd?w=800&q=80'),
  ('Clear File Folder', 'Protect your documents.', 20.00, 0, 100, true, cat_stationary, 'https://images.unsplash.com/photo-1586075010923-2dd45eeed8bd?w=800&q=80');

END $$;

SELECT 'Successfully added 15 stationary items!' as result;
