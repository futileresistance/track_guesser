# Tune Guesser

Real-time web-based music guessing game for groups of friends.

## Features

- Host creates game room with QR code for easy joining
- Players add tracks via Deezer API search
- Real-time gameplay with audio snippets
- Live leaderboard and scoring
- Mobile-friendly player interface

## Tech Stack

- **Frontend**: React, Socket.io-client
- **Backend**: Python, FastAPI, python-socketio
- **Database**: Supabase (PostgreSQL + Real-time)
- **Music API**: Deezer API
- **Deployment**: TBD

## Project Structure

```
tune-guesser/
├── client/          # React frontend
└── server/          # Python backend
```

## Quick Start

1. Install client dependencies: `cd client && npm install`
2. Install server dependencies: `cd server && pip install -r requirements.txt`
3. Set up environment variables (see .env.example files in `client` and `server` directories)
4. Start client: `cd client && npm start`
5. Start server: `cd server && python main.py`

## Environment Setup

### Deezer API
1. Deezer API is free and doesn't require authentication for basic operations
2. No API keys or credentials needed

### Supabase
1. Create project at https://supabase.com
2. Run database migrations from `server/migrations/`

## Game Flow

1. **Lobby**: Host creates room, players join via QR code
2. **Track Selection**: Players search and add songs (up to 10 per player)
3. **Gameplay**: Audio snippets with intelligent time limits
4. **Scoring**: Smart scoring with artist/track matching and speed bonuses
5. **Feedback**: Detailed scoring breakdown after each guess
6. **Results**: Final leaderboard with comprehensive stats

## Game Modes

- **Easy**: 30 seconds per track, perfect for beginners
- **Medium**: 15 seconds per track, balanced challenge
- **Hard**: 5 seconds + 5 second bonus period, for music experts