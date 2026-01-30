-- Fix for 'invalid input value for enum order_status: "returned"' error
-- We are removing 'returned' from the status check because it does not exist in the defined Enum.

CREATE OR REPLACE FUNCTION public.auto_assign_runner()
RETURNS TRIGGER AS $$
DECLARE
    available_runner_id UUID;
    feature_enabled BOOLEAN;
BEGIN
    -- 1. Check if the Feature Toggle is enabled
    -- Safe check: if table doesn't exist or row missing, default to false
    BEGIN
        SELECT is_enabled INTO feature_enabled
        FROM public.feature_toggles
        WHERE feature_name = 'auto_runner_logic';
    EXCEPTION WHEN OTHERS THEN
        feature_enabled := false;
    END;

    -- If feature is missing or disabled, do nothing (preserve manual assignment functionality)
    IF feature_enabled IS NOT TRUE THEN
        RETURN NEW;
    END IF;

    -- 2. Find the best available runner
    SELECT r.id INTO available_runner_id
    FROM public.runners r
    JOIN public.runner_shifts rs ON r.id = rs.runner_id
    WHERE rs.end_time IS NULL
      AND rs.break_start_time IS NULL
      AND r.is_active = true
    ORDER BY (
        SELECT COUNT(*)
        FROM public.orders o
        WHERE o.runner_id = r.id
          AND o.status NOT IN ('delivered', 'cancelled') -- FIXED: Removed 'returned'
    ) ASC,
    RANDOM()
    LIMIT 1;

    -- 3. If a qualified runner is found, assign them
    IF available_runner_id IS NOT NULL THEN
        NEW.runner_id := available_runner_id;
        
        -- Log the assignment
        RAISE NOTICE 'Auto-assigned Order % to Runner %', NEW.id, available_runner_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
