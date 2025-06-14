# Tune Guesser - Client

A modern, responsive React web application for the Tune Guesser multiplayer music guessing game. Players can create games, join via QR codes, search for tracks, and compete in real-time music guessing challenges.

## Features

- **Real-time multiplayer gameplay** with Socket.IO integration
- **QR code sharing** for easy game joining
- **Track search and preview** using Deezer API
- **Responsive design** that works on desktop and mobile
- **Game state management** with React Context
- **Audio playback** for track previews and game rounds
- **Real-time leaderboards** and scoring
- **Multiple difficulty modes** (Easy, Medium, Hard)
- **Progressive Web App** capabilities

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks and context
- **React Router DOM** - Client-side routing
- **Socket.IO Client** - Real-time communication with server
- **Axios** - HTTP client for API requests
- **QRCode.react** - QR code generation for game sharing
- **CSS3** - Custom styling with modern design
- **Create React App** - Development and build tooling

## 📁 Project Structure

```

## 🚀 Getting Started

### Prerequisites

- Node.js 16 or higher
- npm package manager
- Running Tune Guesser server (see server README)

### Installation

1. **Navigate to the client directory:**
   ```bash
   cd client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the client directory:
   ```env
   REACT_APP_SERVER_URL=http://localhost:5001
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

The application will open at `http://localhost:3000`

## 🎯 Game Flow

### 1. Home Screen
- **Create Game:** Host creates a new game room
- **Join Game:** Players can join existing games
- **How to Play:** Instructions and game rules

### 2. Host View (`/host/:gameId`)
- **QR Code:** Shareable QR code for players to join
- **Player Management:** View connected players and their status
- **Track Management:** Monitor total tracks added
- **Game Controls:** Start game, manage rounds, end game
- **Difficulty Selection:** Choose game difficulty (Easy/Medium/Hard)

### 3. Player View (`/player/:gameId`)
- **Track Addition:** Search and add tracks to the game
- **Ready Status:** Mark as ready to start
- **Gameplay:** Submit guesses during rounds
- **Real-time Updates:** See other players and game progress

### 4. Join Game (`/join`)
- **Game ID Entry:** Enter game ID manually
- **QR Scanner:** Scan QR codes to join games
- **Player Name:** Set display name for the game

## 🎵 Track Management

### Track Search
- **Deezer Integration:** Search through Deezer's music library
- **Preview Playback:** Listen to 30-second track previews
- **Track Validation:** Only tracks with previews can be added
- **Debounced Search:** Optimized search with 500ms delay

### Track Limits
- **Per Player:** Up to 10 tracks per player
- **Minimum:** 5 tracks recommended per player
- **Total:** Maximum 20 rounds per game

## ⚡ Real-time Features

### Socket.IO Events
- **Connection Management:** Automatic reconnection
- **Game State Sync:** Real-time game status updates
- **Player Updates:** Live player list and status changes
- **Round Management:** Automatic round progression
- **Score Updates:** Real-time leaderboard updates

### Game States
- **Lobby:** Players joining and adding tracks
- **Playing:** Active gameplay with countdown timers
- **Round End:** Results display and scoring
- **Game Finished:** Final results and leaderboard

## 🎮 Difficulty Modes

| Mode | Time Limit | Description |
|------|------------|-------------|
| Easy | 30 seconds | Relaxed gameplay, plenty of time to think |
| Medium | 15 seconds | Balanced challenge for most players |
| Hard | 5 seconds | Fast-paced, quick thinking required |

## 📱 Responsive Design

### Mobile-First Approach
- **Touch-friendly** buttons and controls
- **QR Code Scanning** optimized for mobile cameras
- **Responsive Layout** adapts to screen sizes
- **Audio Controls** designed for mobile playback

### Progressive Web App
- **Offline Capability** (basic functionality)
- **App-like Experience** when installed
- **Fast Loading** with optimized assets

## 🎨 UI Components

### Core Components
- **Home:** Landing page with game options
- **HostView:** Game management interface
- **PlayerView:** Player gameplay interface
- **JoinGame:** Game joining interface
- **TrackSearch:** Music search and selection
- **AudioPlayer:** Audio playback controls
- **Leaderboard:** Score display and rankings

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_SERVER_URL` | Backend server URL | `http://localhost:5001` |

### Game Settings
- **Min Players:** 2 players required to start
- **Max Players:** 8 players per game
- **Min Tracks:** 5 tracks per player recommended
- **Max Tracks:** 10 tracks per player
- **Max Rounds:** 20 rounds per game


## 🚀 Deployment

### Development
```bash
npm start
```

### Production Build
```bash
npm run build
```

### Build Output
The `build` folder contains:
- **Static Assets:** Optimized CSS, JS, and media files
- **Index.html:** Main entry point
- **Service Worker:** PWA functionality
- **Manifest:** App installation metadata

### Deployment Options
- **Netlify:** Drag and drop `build` folder
- **Vercel:** Connect repository for automatic deployment
- **GitHub Pages:** Deploy from `gh-pages` branch
- **Traditional Hosting:** Upload `build` contents

## 🔒 Security

### Client-Side Security
- **Input Validation:** All user inputs are validated
- **XSS Prevention:** React's built-in XSS protection
- **CORS Handling:** Proper cross-origin request handling
- **Environment Variables:** Sensitive data in environment files

### Best Practices
- **HTTPS Only:** Production deployments use HTTPS
- **Content Security Policy:** Configured for security
- **Error Boundaries:** Graceful error handling

## 🔗 Related Documentation

- [Server README](../server/README.md) - Backend server documentation
- [Main Project README](../README.md) - Overall project overview