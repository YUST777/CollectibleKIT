-- Run this to make the view private (only visible to YOU in the dashboard)
REVOKE
SELECT ON submissions_with_details
FROM anon,
    authenticated;
REVOKE ALL ON submissions_with_details
FROM anon,
    authenticated;
-- Now no one can access it via the API, but you can still see it in the Table Editor.