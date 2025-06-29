import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import TrackSearch from './TrackSearch';
import AudioPlayer from './AudioPlayer';

function PlayerView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { state, actions } = useGame();
  const [guess, setGuess] = useState('');

  // Debug logging
  useEffect(() => {
    console.log('🔍 PlayerView Debug Info:', {
      gameId,
      state: {
        playerId: state.playerId,
        gameId: state.gameId,
        gameStatus: state.gameStatus,
        players: state.players,
        tracks: state.tracks,
        userTracks: state.userTracks,
        readyPlayers: state.readyPlayers,
        error: state.error,
        loading: state.loading
      }
    });
  }, [gameId, state]);

  // Debug logging for track updates
  useEffect(() => {
    console.log('🎵 Track Update Debug:', {
      userTracksCount: state.userTracks.length,
      globalTracksCount: state.tracks.length,
      userTracks: state.userTracks.map(t => ({ name: t.name, id: t.id })),
      globalTracks: state.tracks.map(t => ({ name: t.name, id: t.id, added_by: t.added_by }))
    });
  }, [state.userTracks, state.tracks]);

  useEffect(() => {
    // Clear guess when new round starts
    if (state.currentTrack) {
      setGuess('');
    }
  }, [state.currentTrack]);

  const handleSubmitGuess = (e) => {
    e.preventDefault();
    if (guess.trim()) {
      actions.submitGuess(guess);
    }
  };

  const handleLeaveGame = () => {
    if (window.confirm('Are you sure you want to leave the game?')) {
      actions.leaveGame();
      navigate('/');
    }
  };

  const toggleReady = () => {
    const isCurrentlyReady = state.readyPlayers.includes(state.playerId);
    console.log('🔄 Toggling ready status:', { 
      isCurrentlyReady, 
      playerId: state.playerId,
      gameId: state.gameId,
      socket: state.socket?.connected,
      readyPlayers: state.readyPlayers
    });
    
    if (!state.socket?.connected) {
      console.error('❌ Socket not connected!');
      return;
    }
    
    // Use the gameId from URL params if state.gameId is not set
    const currentGameId = state.gameId || gameId;
    
    if (!currentGameId || !state.playerId) {
      console.error('❌ Missing gameId or playerId:', { 
        gameId: currentGameId, 
        playerId: state.playerId,
        urlGameId: gameId,
        stateGameId: state.gameId
      });
      return;
    }
    
    actions.setReady(!isCurrentlyReady);
  };

  const myTracks = state.userTracks || [];
  const requiredTracks = 0;
  const isReady = state.readyPlayers.includes(state.playerId);
  const canBeReady = true;

  console.log('🎵 Track Debug Info:', {
    myTracks: myTracks.length,
    requiredTracks,
    isReady,
    canBeReady,
    readyPlayers: state.readyPlayers.length,
    totalPlayers: state.players.length
  });

  // Calculate effective time limit for hard mode
  const effectiveTimeLimit = state.difficulty === 'hard' ? state.totalTimeLimit + 5 : state.totalTimeLimit;
  const inputDisabled = state.timeLeft === 0 || state.guess;
  // In hard mode, input should only be disabled when timeLeft === 0 (after track+5s)
  // For hard mode, we need to check if we're in the extended submission period
  // In hard mode, timeLeft goes from 5 to 0, but submissions are allowed for 5 more seconds after that
  // So we need to track if we're in the extended submission period
  const isInExtendedSubmissionPeriod = state.difficulty === 'hard' && state.timeLeft === 0 && !state.guess;
  // Only disable input if player has already submitted a guess
  // Let the server handle time validation for hard mode's extended submission period
  const isInputDisabled = state.guess;

  if (state.gameStatus === 'lobby') {
    return (
      <div className="player-view">
        <div className="container">
          <div className="card">
            <h2>🎵 Add Your Tracks</h2>
            <p>Game ID: <strong>{gameId}</strong></p>
            <p>Player: <strong>{state.playerName}</strong></p>
            
            <div style={{ margin: '20px 0' }}>
              <p>Added: <strong>{myTracks.length}</strong> tracks (optional)</p>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${Math.min((myTracks.length / 5) * 100, 100)}%`,
                    backgroundColor: myTracks.length > 0 ? '#28a745' : '#667eea'
                  }}
                ></div>
              </div>
              {myTracks.length > 0 && (
                <p style={{ fontSize: '14px', color: '#28a745', marginTop: '5px' }}>
                  ✅ {myTracks.length} track{myTracks.length !== 1 ? 's' : ''} added successfully!
                </p>
              )}
            </div>
          </div>
          
          <div className="card">
            <TrackSearch onTrackAdd={actions.addTrack} />
          </div>
          
          {myTracks.length > 0 && (
            <div className="card">
              <h3>Your Tracks</h3>
              <div className="track-list">
                {myTracks.map((track, index) => (
                  <div key={index} className="track-item" style={{ display: 'flex', alignItems: 'center' }}>
                    {track.album?.images?.[2] && (
                      <img src={track.album.images[2].url} alt="Album" />
                    )}
                    <div className="track-details">
                      <div className="track-title">{track.name}</div>
                      <div className="track-artist">
                        {track.artists.map(a => a.name).join(', ')}
                      </div>
                    </div>
                    <button
                      className="btn btn-danger"
                      style={{ marginLeft: 'auto', fontSize: '12px', padding: '4px 10px' }}
                      onClick={() => actions.removeTrack(track.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              <button 
                className={`btn ${isReady ? 'btn-success' : 'btn-secondary'}`}
                onClick={toggleReady}
                disabled={!canBeReady}
              >
                {isReady ? '✅ Ready!' : '⏳ Ready Up'}
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p><strong>Ready Players:</strong> {state.readyPlayers.length}/{state.players.length}</p>
              <p><strong>Total Tracks:</strong> {state.tracks.length}</p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Host will start the game when all players are ready!
              </p>
            </div>
            
            <button 
              className="btn btn-danger"
              onClick={handleLeaveGame}
              style={{ marginTop: '10px' }}
            >
              Leave Game
            </button>
            
            {/* Debug panel */}
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              fontSize: '12px',
              textAlign: 'left'
            }}>
              <h4 style={{ marginBottom: '10px', color: '#666' }}>🔧 Debug Info</h4>
              <p><strong>Player ID:</strong> {state.playerId || 'Not set'}</p>
              <p><strong>Game ID:</strong> {state.gameId || gameId}</p>
              <p><strong>Socket:</strong> {state.socket?.connected ? '✅ Connected' : '❌ Disconnected'}</p>
              <p><strong>My Tracks:</strong> {myTracks.length}</p>
              <p><strong>Global Tracks:</strong> {state.tracks.length}</p>
              <p><strong>Ready Status:</strong> {isReady ? '✅ Ready' : '⏳ Not Ready'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.gameStatus === 'playing') {
    return (
      <div className="player-view">
        <div className="container">
          <div className="card">
            <h2>Round {state.currentRound} of {state.totalRounds}</h2>
            <p>Your Score: <strong>{state.score}</strong></p>
            
            {state.currentTrack && (
              <AudioPlayer 
                track={state.currentTrack}
                timeLeft={state.timeLeft}
                totalTimeLimit={state.totalTimeLimit}
                difficulty={state.difficulty}
                isHost={false}
              />
            )}
          </div>
          
          <div className="card">
            <h3>What's this song?</h3>
            <form onSubmit={handleSubmitGuess}>
              <input
                type="text"
                className="guess-input"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Enter song title..."
                disabled={isInputDisabled}
              />
              <button 
                type="submit" 
                className="btn" 
                style={{ width: '100%' }}
                disabled={!guess.trim() || isInputDisabled}
              >
                {state.guess ? '✅ Submitted!' : '🎯 Submit Guess'}
              </button>
            </form>
            
            {state.guess && (
              <div className="status-message status-info">
                Your guess: <strong>{state.guess}</strong>
              </div>
            )}
            
            {state.guessResult && (
              <div className={`status-message ${state.guessResult.correct ? 'status-success' : 'status-info'}`}>
                <div style={{ marginBottom: '10px' }}>
                  <strong>
                    {state.guessResult.correct ? '✅ Correct!' : '❌ Not quite right'}
                  </strong>
                  {state.guessResult.points > 0 && (
                    <span style={{ marginLeft: '10px' }}>
                      +{state.guessResult.points} points
                    </span>
                  )}
                </div>
                
                <div style={{ fontSize: '14px', textAlign: 'left' }}>
                  <div>Artist: {state.guessResult.artistScore === 1 ? '✅' : '❌'} ({Math.round(state.guessResult.artistScore * 100)}%)</div>
                  <div>Track: {Math.round(state.guessResult.trackScore * 100)}% match</div>
                  <div>Total: {Math.round(state.guessResult.totalScore * 100)}% accuracy</div>
                  {state.guessResult.speedBonus > 0 && (
                    <div>Speed bonus: +{state.guessResult.speedBonus}%</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="card" style={{ textAlign: 'center' }}>
            <button 
              className="btn btn-danger"
              onClick={handleLeaveGame}
            >
              Leave Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.gameStatus === 'finished') {
    const myPosition = state.leaderboard.findIndex(p => p.id === state.playerId) + 1;
    
    return (
      <div className="player-view">
        <div className="container">
          <div className="card" style={{ textAlign: 'center' }}>
            <h2>🏆 Game Over!</h2>
            <div style={{ margin: '30px 0' }}>
              <h3>Your Result</h3>
              <p style={{ fontSize: '2rem', margin: '10px 0' }}>#{myPosition}</p>
              <p>Final Score: <strong>{state.score}</strong></p>
            </div>
            
            <div style={{ marginTop: '30px' }}>
              <button 
                className="btn"
                onClick={() => navigate('/')}
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.gameStatus === 'gameFinished') {
    return (
      <div className="player-view">
        <div className="container">
          <div className="card" style={{ textAlign: 'center' }}>
            <h2>🎯 Game is Finished!</h2>
            <p style={{ fontSize: '18px', margin: '20px 0' }}>
              All rounds have been completed. Waiting for the host to reveal the final results...
            </p>
            
            <div style={{ marginTop: '30px' }}>
              <button 
                className="btn btn-danger"
                onClick={handleLeaveGame}
              >
                Leave Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loading">
      <div className="spinner"></div>
    </div>
  );
}

export default PlayerView;