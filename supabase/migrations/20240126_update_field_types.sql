-- Drop the existing constraint
ALTER TABLE "public"."admin_form_fields" DROP CONSTRAINT IF EXISTS "admin_form_fields_field_type_check";

-- Re-add the constraint with new allowed values
ALTER TABLE "public"."admin_form_fields" ADD CONSTRAINT "admin_form_fields_field_type_check" 
    'text', 
    'textarea', 
    'number', 
    'rating', 
    'boolean', 
    'select', 
    'date', 
    'email', 
    'tel', 
    'url', 
    'time',
    'login',
    'file',
    'signature',
    'image',
    'section'
));
