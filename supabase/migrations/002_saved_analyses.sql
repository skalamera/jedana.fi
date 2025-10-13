-- Saved analyses for AI screener
CREATE TABLE IF NOT EXISTS saved_analyses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_analyses_user_id ON saved_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_analyses_symbol ON saved_analyses(symbol);

-- Enable RLS
ALTER TABLE saved_analyses ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own saved analyses" ON saved_analyses;
DROP POLICY IF EXISTS "Users can insert own saved analyses" ON saved_analyses;
DROP POLICY IF EXISTS "Users can delete own saved analyses" ON saved_analyses;

CREATE POLICY "Users can view own saved analyses" ON saved_analyses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved analyses" ON saved_analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved analyses" ON saved_analyses
    FOR DELETE USING (auth.uid() = user_id);


