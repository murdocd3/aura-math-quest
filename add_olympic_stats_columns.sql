-- SQL MIGRATION: ADD OLYMPIC STATS TO GAME_STATES
-- Execute this SQL query in your Supabase SQL Editor:

ALTER TABLE game_states ADD COLUMN IF NOT EXISTS olympic_scores JSONB DEFAULT '{}'::jsonb;
ALTER TABLE game_states ADD COLUMN IF NOT EXISTS olympic_wrong_count INT DEFAULT 0;
ALTER TABLE game_states ADD COLUMN IF NOT EXISTS olympic_history JSONB DEFAULT '[]'::jsonb;
