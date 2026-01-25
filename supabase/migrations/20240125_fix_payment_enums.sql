-- Fix invalid input value for enum payment_method: "netbanking"
-- This expands the allowed payment methods to support modern gateway options

-- 1. Create a temporary type with all values
CREATE TYPE payment_method_new AS ENUM ('upi', 'cod', 'card', 'netbanking', 'bnpl');

-- 2. Update the column to use the new type
ALTER TABLE public.orders 
  ALTER COLUMN payment_method TYPE payment_method_new 
  USING (payment_method::text::payment_method_new);

-- 3. Drop the old type and rename the new one
DROP TYPE public.payment_method;
ALTER TYPE payment_method_new RENAME TO payment_method;

-- 4. Refresh schema cache
NOTIFY pgrst, 'reload schema';
