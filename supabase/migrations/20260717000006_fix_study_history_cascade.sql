-- Drop the existing constraint
ALTER TABLE public.study_history 
  DROP CONSTRAINT IF EXISTS study_history_user_id_fkey;

-- Add it back with ON DELETE CASCADE
ALTER TABLE public.study_history 
  ADD CONSTRAINT study_history_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
