DO $$
DECLARE
    shift_count INTEGER;
    active_shift_count INTEGER;
BEGIN
    SELECT count(*) INTO shift_count FROM public.runner_shifts;
    SELECT count(*) INTO active_shift_count FROM public.runner_shifts WHERE status = 'active';
    
    RAISE NOTICE 'Total Shifts: %, Active Shifts: %', shift_count, active_shift_count;
END $$;
