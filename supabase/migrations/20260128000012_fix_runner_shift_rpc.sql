-- Secure Functions to bypass RLS for Runner Ops (since runners use custom auth)

-- 1. Start Shift
CREATE OR REPLACE FUNCTION start_runner_shift(p_runner_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift_record json;
BEGIN
  -- Check if already active shift exists?
  -- ideally we close old ones, but for now just insert new
  
  INSERT INTO runner_shifts (runner_id, status, start_time)
  VALUES (p_runner_id, 'active', now())
  RETURNING row_to_json(runner_shifts.*) INTO v_shift_record;

  -- Update runner status
  UPDATE runners SET is_active = true WHERE id = p_runner_id;

  RETURN v_shift_record;
END;
$$;

-- 2. End Shift
CREATE OR REPLACE FUNCTION end_runner_shift(p_runner_id uuid, p_shift_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE runner_shifts 
  SET status = 'completed', end_time = now()
  WHERE id = p_shift_id AND runner_id = p_runner_id;

  UPDATE runners SET is_active = false WHERE id = p_runner_id;
END;
$$;

-- 3. Toggle Break
CREATE OR REPLACE FUNCTION toggle_runner_break(p_runner_id uuid, p_shift_id uuid, is_start boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_start THEN
    UPDATE runner_shifts 
    SET break_start_time = now()
    WHERE id = p_shift_id AND runner_id = p_runner_id;
    
    UPDATE runners SET is_active = false WHERE id = p_runner_id;
  ELSE
    UPDATE runner_shifts 
    SET break_start_time = null 
    WHERE id = p_shift_id AND runner_id = p_runner_id;
    
    UPDATE runners SET is_active = true WHERE id = p_runner_id;
  END IF;
END;
$$;

-- Grant access to anonymous (since runners are effectively anon but validated by client code logic for now)
GRANT EXECUTE ON FUNCTION start_runner_shift(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION end_runner_shift(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION toggle_runner_break(uuid, uuid, boolean) TO anon, authenticated, service_role;
