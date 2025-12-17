-- Run this in your Supabase SQL Editor to create a "View".
-- A "View" is like a virtual table that automatically joins the data for you.
CREATE OR REPLACE VIEW submissions_with_details AS
SELECT s.id as submission_id,
    s.sheet_name,
    s.problem_name,
    s.submitted_at,
    -- User Info from Users Table
    u.email as login_email,
    -- Profile Info from Applications Table
    a.name as student_name,
    a.student_id,
    a.telephone as phone_number,
    a.faculty,
    s.file_content
FROM sheet_submissions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN applications a ON u.application_id = a.id
ORDER BY s.submitted_at DESC;
-- After running this, go to your Table Editor and look for "submissions_with_details" 
-- (it might be under "Views" or just in the list of tables).