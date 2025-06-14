import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const GameContext = createContext();

const initialState = {
  socket: null,
  gameId: null,
  playerId: null,
  playerName: '',
  isHost: false,
  gameStatus: 'lobby', // lobby, playing, finished
  players: [],
  tracks: [],
  currentTrack: null,
  currentRound: 0,
  totalRounds: 0,
  timeLeft: 0,
  userTracks: [],
  guess: '',
  score: 0,
  leaderboard: [],
  error: null,
  loading: false,
  shouldNavigate: null,
  readyPlayers: [], // Track which players are ready
  minTracksPerPlayer: 5, // Minimum tracks required per player
  minPlayers: 2 // Minimum players required to start
};

const getInitialState = () => ({
  ...initialState,
  playerId: localStorage.getItem('playerId') || null,
  gameId: localStorage.getItem('gameId') || null,
  playerName: localStorage.getItem('playerName') || '',
});

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_SOCKET':
      return { ...state, socket: action.payload };
    case 'SET_GAME_ID':
      return { ...state, gameId: action.payload };
    case 'SET_PLAYER_INFO':
      return { 
        ...state, 
        playerId: action.payload.id, 
        playerName: action.payload.name 
      };
    case 'SET_HOST':
      return { ...state, isHost: action.payload };
    case 'SET_GAME_STATUS':
      return { ...state, gameStatus: action.payload };
    case 'UPDATE_PLAYERS':
      return { ...state, players: action.payload };
    case 'UPDATE_TRACKS':
      return { ...state, tracks: action.payload };
    case 'SET_CURRENT_TRACK':
      return { ...state, currentTrack: action.payload };
    case 'SET_ROUND_INFO':
      return { 
        ...state, 
        currentRound: action.payload.current, 
        totalRounds: action.payload.total 
      };
    case 'SET_TIME_LEFT':
      return { ...state, timeLeft: action.payload };
    case 'ADD_USER_TRACK':
      return { 
        ...state, 
        userTracks: [...state.userTracks, action.payload] 
      };
    case 'SET_GUESS':
      return { ...state, guess: action.payload };
    case 'UPDATE_SCORE':
      return { ...state, score: action.payload };
    case 'UPDATE_LEADERBOARD':
      return { ...state, leaderboard: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SHOULD_NAVIGATE':
      return { ...state, shouldNavigate: action.payload };
    case 'SET_READY_PLAYERS':
      return { ...state, readyPlayers: action.payload };
    case 'ADD_READY_PLAYER':
      return { 
        ...state, 
        readyPlayers: [...state.readyPlayers, action.payload] 
      };
    case 'REMOVE_READY_PLAYER':
      return { 
        ...state, 
        readyPlayers: state.readyPlayers.filter(id => id !== action.payload) 
      };
    case 'RESET_GAME':
      localStorage.removeItem('playerId');
      localStorage.removeItem('gameId');
      localStorage.removeItem('playerName');
      return { ...initialState, socket: state.socket };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, getInitialState);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5001', {
      path: "/socket.io",
      transports: ['websocket'],
    });
    dispatch({ type: 'SET_SOCKET', payload: socket });
    
    socket.on('connect', () => {
      console.log('Socket connected!', socket.id);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    // Socket event listeners
    socket.on('gameCreated', (data) => {
      dispatch({ type: 'SET_GAME_ID', payload: data.gameId });
      dispatch({ type: 'SET_HOST', payload: true });
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_SHOULD_NAVIGATE', payload: `/host/${data.gameId}` });
      localStorage.setItem('gameId', data.gameId);
      localStorage.setItem('playerId', data.hostId);
      localStorage.setItem('playerName', '');
    });

    socket.on('playerJoined', (data) => {
      console.log('🎮 [DEBUG] playerJoined event received:', data);
      dispatch({ type: 'UPDATE_PLAYERS', payload: data.players });
      dispatch({ type: 'SET_PLAYER_INFO', payload: { id: data.playerId, name: data.player.name } });
      dispatch({ type: 'SET_GAME_ID', payload: data.gameId });
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_SHOULD_NAVIGATE', payload: `/player/${data.gameId}` });
      localStorage.setItem('playerId', data.playerId);
      localStorage.setItem('gameId', data.gameId);
      localStorage.setItem('playerName', data.player.name);
    });

    socket.on('playerListUpdate', (data) => {
      console.log('👥 Player list updated:', data);
      dispatch({ type: 'UPDATE_PLAYERS', payload: data.players });
    });

    socket.on('playerLeft', (data) => {
      console.log('👋 Player left:', data);
      dispatch({ type: 'UPDATE_PLAYERS', payload: data.players });
    });

    socket.on('trackAdded', (data) => {
      console.log('🎵 Track added:', data);
      dispatch({ type: 'UPDATE_TRACKS', payload: data.tracks });
    });

    socket.on('playerReady', (data) => {
      dispatch({ type: 'ADD_READY_PLAYER', payload: data.playerId });
    });

    socket.on('playerUnready', (data) => {
      dispatch({ type: 'REMOVE_READY_PLAYER', payload: data.playerId });
    });

    socket.on('readyPlayersUpdate', (data) => {
      console.log('📥 readyPlayersUpdate received:', data);
      dispatch({ type: 'SET_READY_PLAYERS', payload: data.readyPlayers });
    });

    socket.on('gameStarted', (data) => {
      dispatch({ type: 'SET_GAME_STATUS', payload: 'playing' });
      dispatch({ type: 'SET_ROUND_INFO', payload: data.roundInfo });
    });

    socket.on('newRound', (data) => {
      console.log('🔄 New round started:', data);
      dispatch({ type: 'SET_CURRENT_TRACK', payload: data.track });
      dispatch({ type: 'SET_ROUND_INFO', payload: data.roundInfo });
      dispatch({ type: 'SET_TIME_LEFT', payload: data.timeLimit });
      dispatch({ type: 'SET_GUESS', payload: '' });
    });

    socket.on('timeUpdate', (data) => {
      dispatch({ type: 'SET_TIME_LEFT', payload: data.timeLeft });
    });

    socket.on('roundEnd', (data) => {
      dispatch({ type: 'UPDATE_LEADERBOARD', payload: data.leaderboard });
    });

    socket.on('gameEnd', (data) => {
      dispatch({ type: 'SET_GAME_STATUS', payload: 'finished' });
      dispatch({ type: 'UPDATE_LEADERBOARD', payload: data.finalLeaderboard });
    });

    socket.on('gameEnded', (data) => {
      dispatch({ type: 'SET_GAME_STATUS', payload: 'finished' });
    });

    socket.on('guessReceived', (data) => {
      console.log('Guess received:', data.message);
    });

    socket.on('roundAdvanced', (data) => {
      console.log('Round advanced:', data.message);
    });

    socket.on('scoreUpdate', (data) => {
      dispatch({ type: 'UPDATE_SCORE', payload: data.score });
    });

    socket.on('error', (data) => {
      // If error is related to join, clear localStorage
      if (data.message && data.message.toLowerCase().includes('join')) {
        localStorage.removeItem('playerId');
        localStorage.removeItem('gameId');
        localStorage.removeItem('playerName');
      }
      dispatch({ type: 'SET_ERROR', payload: data.message });
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    socket.on('guessResult', (data) => {
      console.log('🎯 Guess result received:', data);
      dispatch({ type: 'UPDATE_SCORE', payload: data.newScore });
      // You could also show a notification here
    });

    socket.on('leaderboardUpdate', (data) => {
      console.log('🏆 Leaderboard updated:', data);
      dispatch({ type: 'UPDATE_LEADERBOARD', payload: data.leaderboard });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Handle navigation when shouldNavigate is set
  useEffect(() => {
    if (state.shouldNavigate) {
      navigate(state.shouldNavigate);
      dispatch({ type: 'SET_SHOULD_NAVIGATE', payload: null });
    }
  }, [state.shouldNavigate, navigate]);

  // Check if game can start automatically
  useEffect(() => {
    if (state.gameStatus === 'lobby' && state.isHost) {
      const canStart = 
        state.players.length >= state.minPlayers &&
        state.tracks.length >= (state.players.length * state.minTracksPerPlayer) &&
        state.readyPlayers.length === state.players.length;
      
      if (canStart) {
        // Auto-start the game when all conditions are met
        actions.startGame();
      }
    }
  }, [state.players, state.tracks, state.readyPlayers, state.gameStatus, state.isHost]);

  const actions = {
    createGame: () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      state.socket?.emit('createGame');
    },

    joinGame: (gameId, playerName) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      state.socket?.emit('joinGame', { gameId, playerName });
    },

    addTrack: (track) => {
      const currentGameId = state.gameId || window.location.pathname.split('/').pop();
      
      if (!currentGameId || !state.playerId) {
        console.error('❌ Missing gameId or playerId for addTrack:', { 
          gameId: currentGameId, 
          playerId: state.playerId 
        });
        return;
      }
      
      state.socket?.emit('addTrack', { 
        gameId: currentGameId, 
        track,
        playerId: state.playerId 
      });
      dispatch({ type: 'ADD_USER_TRACK', payload: track });
    },

    setReady: (isReady) => {
      const currentGameId = state.gameId || window.location.pathname.split('/').pop();
      
      if (!currentGameId || !state.playerId) {
        console.error('❌ Missing gameId or playerId for setReady:', { 
          gameId: currentGameId, 
          playerId: state.playerId 
        });
        return;
      }
      
      state.socket?.emit('setReady', { 
        gameId: currentGameId, 
        playerId: state.playerId,
        isReady: isReady 
      });
    },

    startGame: () => {
      state.socket?.emit('startGame', { gameId: state.gameId });
    },

    submitGuess: (guess) => {
      state.socket?.emit('submitGuess', {
        gameId: state.gameId,
        playerId: state.playerId,
        guess: guess.trim()
      });
      dispatch({ type: 'SET_GUESS', payload: guess });
    },

    nextRound: () => {
      state.socket?.emit('nextRound', { gameId: state.gameId });
    },

    leaveGame: () => {
      state.socket?.emit('leaveGame', { 
        gameId: state.gameId, 
        playerId: state.playerId 
      });
      localStorage.removeItem('playerId');
      localStorage.removeItem('gameId');
      localStorage.removeItem('playerName');
      dispatch({ type: 'RESET_GAME' });
    },

    clearError: () => {
      dispatch({ type: 'SET_ERROR', payload: null });
    }
  };

  return (
    <GameContext.Provider value={{ state, actions }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}