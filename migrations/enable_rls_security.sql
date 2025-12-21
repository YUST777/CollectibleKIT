-- Enable Row Level Security (RLS) on sensitive tables
-- This fixes the Supabase Security Advisor warnings.
-- By enabling RLS without adding policies, we deny access to these tables via the Supabase Client API (PostgREST)
-- for 'anon' and 'authenticated' web users, while still allowing the backend (which uses the postgres/service role) to access them.

ALTER TABLE IF EXISTS public.login_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.password_resets ENABLE ROW LEVEL SECURITY;
