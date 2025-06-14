# Tune Guesser - Server

## 🚀 Getting Started

### Prerequisites

- Python 3.9 or higher
- Supabase account and project
- Deezer API access (free, no authentication required)

### Installation

1. **Clone the repository and navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Create a `.env` file in the server directory with the following variables:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   
   # Client Configuration
   CLIENT_URL=http://localhost:3000
   
   # Server Configuration
   PORT=5001
   HOST=0.0.0.0
   ```

5. **Run the server:**
   ```bash
   python main.py
   ```

The server will be available at `http://localhost:5001`

## 📡 API Endpoints

### REST API

- `GET /api/health` - Health check endpoint
- `GET /api/game/{game_id}` - Get game details
- `GET /api/game/` - Get recent games
- `GET /api/game/{game_id}/leaderboard` - Get game leaderboard
- `GET /api/game/player/{player_id}` - Get player statistics
- `GET /api/deezer/search` - Search tracks on Deezer
- `GET /api/deezer/track/{track_id}` - Get track details
- `GET /api/deezer/popular` - Get popular tracks

### Socket.IO Events

#### Client to Server
- `createGame` - Create a new game
- `joinGame` - Join an existing game
- `addTrack` - Add a track to the game
- `setReady` - Mark player as ready
- `startGame` - Start the game (host only)
- `submitGuess` - Submit a song guess
- `nextRound` - Start next round (host only)
- `revealResults` - Reveal round results (host only)
- `leaveGame` - Leave the current game

#### Server to Client
- `gameCreated` - Game creation confirmation
- `playerJoined` - New player joined notification
- `playerListUpdate` - Updated player list
- `gameStarted` - Game start notification
- `roundStarted` - New round started
- `timeUpdate` - Countdown timer updates
- `roundEnded` - Round end with results
- `gameEnded` - Game completion
- `error` - Error notifications

## 🎯 Game Flow

1. **Lobby Phase:**
   - Host creates a game and gets a unique game ID
   - Players join using the game ID and their name
   - Players add tracks from Deezer to the game playlist
   - Host starts the game when ready

2. **Gameplay Phase:**
   - Rounds consist of playing track previews
   - Players submit guesses within the time limit
   - Scoring is based on accuracy and speed
   - Host controls round progression

3. **Scoring System:**
   - Exact matches: 100 points
   - Partial matches: 50 points
   - Speed bonus: Up to 25 points for quick answers
   - No points for incorrect guesses

## 🎯 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_KEY` | Supabase anonymous key | Required |
| `CLIENT_URL` | Frontend client URL | `http://localhost:3000` |
| `PORT` | Server port | `5001` |
| `HOST` | Server host | `0.0.0.0` |

### Game Settings

- **Time Limits:** Easy (30s), Medium (15s), Hard (5s)
- **Max Players:** 8 per game
- **Max Tracks:** 10 per player
- **Max Rounds:** 20 per game

## 🧪 Testing

Run the test files to verify functionality:

```bash
# Test Deezer service
python test_deezer.py
```

## 📊 Database Schema

The server uses Supabase with the following main tables:

- **games** - Game metadata and status
- **players** - Player information and scores
- **tracks** - Track information (if needed for persistence)

## 🔒 Security

- CORS is configured to allow requests from the specified client URL
- Input validation is performed on all API endpoints
- Error handling prevents sensitive information leakage
- Supabase provides built-in authentication and authorization
