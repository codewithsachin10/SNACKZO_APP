-- Add enable_sms feature toggle
INSERT INTO feature_toggles (feature_name, display_name, description, is_enabled, icon_key, category)
VALUES (
  'enable_sms',
  'SMS Notifications',
  'Master switch for sending SMS via Fast2SMS. Disable to stop all outgoing SMS.',
  true,
  'sms',
  'engagement'
)
ON CONFLICT (feature_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;
