-- 1. Enable Row Level Security (RLS) on the table
ALTER TABLE sheet_submissions ENABLE ROW LEVEL SECURITY;
-- 2. Create a Policy that allows users to DELETE their OWN rows
-- This checks if the user_id of the row matches the authenticated user's ID
-- NOTE: This assumes Supabase Auth. Since we use custom Auth ("user_id" in table),
-- we mainly rely on the Backend to enforce this with: "WHERE user_id = $1".
-- However, if you want to be extra safe that the "postgres" role can delete:
GRANT DELETE ON sheet_submissions TO postgres;
GRANT DELETE ON sheet_submissions TO service_role;
GRANT DELETE ON sheet_submissions TO authenticated;
GRANT DELETE ON sheet_submissions TO anon;
-- If you are using Supabase Client on Frontend (we are not, we use Backend), you would need:
-- CREATE POLICY "Users can delete own submissions" ON sheet_submissions
-- FOR DELETE USING (auth.uid() = user_id);