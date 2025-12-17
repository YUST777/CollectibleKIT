-- Enable Row Level Security (RLS) is generally recommended, but for simplicity in migration
-- we will create tables without force-enabling it immediately, or we can enable it and add policies.
-- Given this is a simple migration, standard tables are fine.
-- 1. Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id bigint generated always as identity primary key,
    application_type text not null default 'trainee',
    name text not null,
    faculty text not null,
    student_id text not null unique,
    national_id text not null unique,
    student_level text not null,
    telephone text not null,
    address text,
    has_laptop boolean default false,
    codeforces_profile text,
    leetcode_profile text,
    telegram_username text,
    leetcode_data jsonb,
    codeforces_data jsonb,
    scraping_status text default 'pending',
    ip_address text,
    user_agent text,
    email text,
    submitted_at timestamptz default now()
);
-- Indexes for applications
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_national_id ON applications(national_id);
-- 2. API Access Log Table
CREATE TABLE IF NOT EXISTS api_access_log (
    id bigint generated always as identity primary key,
    endpoint text not null,
    ip_address text,
    user_agent text,
    method text,
    status_code integer,
    accessed_at timestamptz default now()
);
-- 3. Website Analytics Table
CREATE TABLE IF NOT EXISTS website_analytics (
    id bigint generated always as identity primary key,
    path text not null,
    ip_address text,
    user_agent text,
    referer text,
    session_id text,
    country text,
    device_type text,
    browser text,
    os text,
    visited_at timestamptz default now()
);
-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_analytics_path ON website_analytics(path);
CREATE INDEX IF NOT EXISTS idx_analytics_visited_at ON website_analytics(visited_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON website_analytics(session_id);
-- 4. Enable RLS (Optional but recommended)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics ENABLE ROW LEVEL SECURITY;
-- create policies to allow the server (service_role) to do everything
-- and maybe public to insert if using Supabase client directly?
-- Since you are using a Node.js backend (`server/index.js`), you likely use valid credentials.
-- If you use the `postgres` connection string, you are `postgres` or `authenticated`.
-- If you use the Supabase `service_role` key, you bypass RLS.
-- So simpler policy for now is to allow all for authenticated or anon if you use the client directly
-- But your server code does the insertion, so as long as you use the connection string from Supabase settings, RLS doesn't block you if you are `postgres` role.
-- 5. Users Table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id bigint generated always as identity primary key,
    email text not null unique,
    password_hash text not null,
    application_id bigint references applications(id) on delete
    set null,
        is_verified boolean default false,
        last_login_at timestamptz,
        created_at timestamptz default now()
);
-- Index for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- 6. Sheet Submissions Table (for .cpp file uploads)
CREATE TABLE IF NOT EXISTS sheet_submissions (
    id bigint generated always as identity primary key,
    user_id bigint references users(id) on delete cascade,
    sheet_name text not null,
    -- e.g., "Mini Quiz #1"
    problem_name text not null,
    -- e.g., "Easy Problem", "Medium Problem", "Hard Problem"
    file_name text not null,
    -- Original filename (e.g., "solution.cpp")
    file_content text,
    -- The actual .cpp code content
    submitted_at timestamptz default now()
);
-- Indexes for sheet submissions
CREATE INDEX IF NOT EXISTS idx_submissions_user ON sheet_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_sheet ON sheet_submissions(sheet_name);
-- Enable RLS for sheet submissions
ALTER TABLE sheet_submissions ENABLE ROW LEVEL SECURITY;