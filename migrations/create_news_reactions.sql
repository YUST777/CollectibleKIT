-- Create news_reactions table
CREATE TABLE IF NOT EXISTS news_reactions (
    id SERIAL PRIMARY KEY,
    news_id VARCHAR(50) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'heart', 'fire')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(news_id, user_id, reaction_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_reactions_news_id ON news_reactions(news_id);
CREATE INDEX IF NOT EXISTS idx_news_reactions_user_id ON news_reactions(user_id);

-- Enable RLS
ALTER TABLE news_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read" ON news_reactions;
DROP POLICY IF EXISTS "Allow users to insert own reactions" ON news_reactions;
DROP POLICY IF EXISTS "Allow users to delete own reactions" ON news_reactions;

-- Allow authenticated users to read all reactions
CREATE POLICY "Allow authenticated read" ON news_reactions
    FOR SELECT TO authenticated USING (true);

-- Allow users to insert their own reactions  
CREATE POLICY "Allow users to insert own reactions" ON news_reactions
    FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT id FROM users WHERE email = current_user));

-- Allow users to delete their own reactions
CREATE POLICY "Allow users to delete own reactions" ON news_reactions
    FOR DELETE TO authenticated USING (user_id = (SELECT id FROM users WHERE email = current_user));
