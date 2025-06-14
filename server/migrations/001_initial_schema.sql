-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(6) PRIMARY KEY,
  host_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'lobby',
  total_rounds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_status CHECK (status IN ('lobby', 'playing', 'finished'))
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(6) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  correct_guesses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tracks table (optional - for storing game tracks)
CREATE TABLE IF NOT EXISTS game_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(6) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  track_id VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  artist VARCHAR(200) NOT NULL,
  album VARCHAR(200),
  preview_url TEXT,
  added_by UUID REFERENCES players(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create guesses table (optional - for storing game history)
CREATE TABLE IF NOT EXISTS guesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(6) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES game_tracks(id) ON DELETE CASCADE,
  guess TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  guess_time_seconds DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_score ON players(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_tracks_game_id ON game_tracks(game_id);
CREATE INDEX IF NOT EXISTS idx_guesses_game_id ON guesses(game_id);
CREATE INDEX IF NOT EXISTS idx_guesses_player_id ON guesses(player_id);

-- Enable Row Level Security (RLS)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guesses ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);
CREATE POLICY "Games can be inserted by everyone" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Games can be updated by everyone" ON games FOR UPDATE USING (true);

CREATE POLICY "Players are viewable by everyone" ON players FOR SELECT USING (true);
CREATE POLICY "Players can be inserted by everyone" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can be updated by everyone" ON players FOR UPDATE USING (true);

CREATE POLICY "Game tracks are viewable by everyone" ON game_tracks FOR SELECT USING (true);
CREATE POLICY "Game tracks can be inserted by everyone" ON game_tracks FOR INSERT WITH CHECK (true);

CREATE POLICY "Guesses are viewable by everyone" ON guesses FOR SELECT USING (true);
CREATE POLICY "Guesses can be inserted by everyone" ON guesses FOR INSERT WITH CHECK (true);