import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { useGame } from '../context/GameContext';
import AudioPlayer from './AudioPlayer';
import Leaderboard from './Leaderboard';

function HostView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { state, actions } = useGame();
  const [joinUrl, setJoinUrl] = useState('');
  const [difficulty, setDifficulty] = useState('medium'); // Default to medium
  const [autoNextRoundTimer, setAutoNextRoundTimer] = useState(null);
  const [showAutoNextMsg, setShowAutoNextMsg] = useState(false);
  const [showRevealButton, setShowRevealButton] = useState(false);

  // Debug logging for track counts
  useEffect(() => {
    console.log('🏠 HostView Debug Info:', {
      gameId,
      state: {
        gameId: state.gameId,
        players: state.players.length,
        tracks: state.tracks.length,
        readyPlayers: state.readyPlayers.length,
        tracksByPlayer: state.players.map(player => ({
          playerId: player.id,
          playerName: player.name,
          trackCount: state.tracks.filter(t => t.added_by === player.id).length
        }))
      }
    });
  }, [gameId, state.players, state.tracks, state.readyPlayers]);

  useEffect(() => {
    if (!state.isHost || state.gameId !== gameId) {
      navigate('/');
      return;
    }
    
    // Generate join URL for QR code
    const baseUrl = window.location.origin;
    setJoinUrl(`${baseUrl}/join?gameId=${gameId}`);
  }, [gameId, state.isHost, state.gameId, navigate]);

  const handleNextRound = () => {
    actions.nextRound();
  };

  const handleEndGame = () => {
    if (window.confirm('Are you sure you want to end the game?')) {
      actions.leaveGame();
      navigate('/');
    }
  };

  const canStartGame = 
    state.players.length >= state.minPlayers &&
    state.tracks.length >= (state.players.length * state.minTracksPerPlayer) &&
    state.readyPlayers.length === state.players.length;

  const handleStartGame = () => {
    actions.startGame(difficulty);
  };

  // Automatically start next round after 6 seconds when round ends
  // For hard mode, add 5 extra seconds to account for extended submission time
  useEffect(() => {
    if (
      state.gameStatus === 'playing' &&
      state.timeLeft === 0 &&
      state.currentRound < state.totalRounds
    ) {
      setShowAutoNextMsg(true);
      const delay = state.difficulty === 'hard' ? 11000 : 6000; // 11s for hard mode (6s + 5s), 6s for others
      const timer = setTimeout(() => {
        handleNextRound();
        setShowAutoNextMsg(false);
      }, delay);
      setAutoNextRoundTimer(timer);
      return () => clearTimeout(timer);
    } else {
      setShowAutoNextMsg(false);
      if (autoNextRoundTimer) clearTimeout(autoNextRoundTimer);
    }
    // eslint-disable-next-line
  }, [state.timeLeft, state.gameStatus, state.currentRound, state.totalRounds, state.difficulty]);

  // Show reveal button automatically after last round
  useEffect(() => {
    if (state.gameStatus === 'gameFinished') {
      setShowRevealButton(true);
    } else {
      setShowRevealButton(false);
    }
  }, [state.gameStatus]);

  // Automatically finish game after last round ends
  // For hard mode, add 5 extra seconds to account for extended submission time
  useEffect(() => {
    if (
      state.gameStatus === 'playing' &&
      state.timeLeft === 0 &&
      state.currentRound === state.totalRounds
    ) {
      const delay = state.difficulty === 'hard' ? 7000 : 2000; // 7s for hard mode (2s + 5s), 2s for others
      const finishTimer = setTimeout(() => {
        actions.nextRound();
      }, delay);
      return () => clearTimeout(finishTimer);
    }
  }, [state.timeLeft, state.currentRound, state.totalRounds, state.gameStatus, actions, state.difficulty]);

  if (state.gameStatus === 'lobby') {
    return (
      <div className="host-view">
        <div className="container">
          <div className="card">
            <div className="game-info">
              <h2>🎮 Game Room</h2>
              <div className="game-id">{gameId}</div>
              
              <div className="qr-code">
                <QRCode 
                  value={joinUrl} 
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
              
              <p>Players scan this QR code to join!</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                Or visit: {window.location.origin}/join
              </p>
            </div>
          </div>
          
          <div className="card">
            <h3>Players ({state.players.length})</h3>
            <div className="players-list">
              {state.players.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>Waiting for players...</p>
              ) : (
                state.players.map((player) => {
                  const playerTracks = state.tracks.filter(t => t.added_by === player.id).length;
                  const isReady = state.readyPlayers.includes(player.id);
                  return (
                    <div key={player.id} className="player-item">
                      <span>{player.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="badge" style={{ 
                          backgroundColor: playerTracks > 0 ? '#28a745' : '#6c757d',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {playerTracks} tracks
                        </span>
                        <span className={`status-badge ${isReady ? 'ready' : 'not-ready'}`}>
                          {isReady ? '✅ Ready' : '⏳ Not Ready'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p><strong>Total Tracks:</strong> {state.tracks.length}</p>
              <p><strong>Ready Players:</strong> {state.readyPlayers.length}/{state.players.length}</p>
              <p style={{ fontSize: '14px', color: '#666' }}>
                {state.gameReadyToStart 
                  ? 'All players are ready! Click "Start Game" to begin.' 
                  : 'Waiting for all players to be ready before you can start the game!'
                }
              </p>
            </div>

            {/* Difficulty Mode Selection */}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <h4 style={{ marginBottom: '15px' }}>🎯 Difficulty Mode</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className={`btn ${difficulty === 'easy' ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => setDifficulty('easy')}
                  style={{ minWidth: '100px' }}
                >
                  🟢 Easy (30s)
                </button>
                <button
                  className={`btn ${difficulty === 'medium' ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => setDifficulty('medium')}
                  style={{ minWidth: '100px' }}
                >
                  🟡 Medium (15s)
                </button>
                <button
                  className={`btn ${difficulty === 'hard' ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => setDifficulty('hard')}
                  style={{ minWidth: '100px' }}
                >
                  🔴 Hard (5s)
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                Players will have {difficulty === 'easy' ? '30' : difficulty === 'medium' ? '15' : '5'} seconds to guess each track
              </p>
            </div>
            
            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              {state.gameReadyToStart ? (
                <button 
                  className="btn btn-success"
                  onClick={handleStartGame}
                  style={{ marginRight: '10px' }}
                >
                  🚀 Start Game
                </button>
              ) : (
                <button 
                  className="btn"
                  disabled={true}
                  style={{ marginRight: '10px' }}
                >
                  ⏳ Waiting for all players to be ready...
                </button>
              )}
              
              <button 
                className="btn btn-danger"
                onClick={handleEndGame}
              >
                End Game
              </button>
            </div>
            
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
              <p><strong>Game ID:</strong> {state.gameId || gameId}</p>
              <p><strong>Socket:</strong> {state.socket?.connected ? '✅ Connected' : '❌ Disconnected'}</p>
              <p><strong>Total Players:</strong> {state.players.length}</p>
              <p><strong>Total Tracks:</strong> {state.tracks.length}</p>
              <p><strong>Ready Players:</strong> {state.readyPlayers.length}</p>
              <p><strong>Can Start:</strong> {canStartGame ? '✅ Yes' : '❌ No'}</p>
              <div style={{ marginTop: '10px' }}>
                <p><strong>Track Details:</strong></p>
                {state.players.map(player => {
                  const playerTracks = state.tracks.filter(t => t.added_by === player.id);
                  return (
                    <p key={player.id} style={{ marginLeft: '10px', fontSize: '11px' }}>
                      {player.name}: {playerTracks.length} tracks
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.gameStatus === 'playing') {
    return (
      <div className="host-view">
        <div className="container">
          <div className="card">
            <div className="game-play">
              <h2>Round {state.currentRound} of {state.totalRounds}</h2>
              
              {state.currentTrack && (
                <div className="current-track">
                  <AudioPlayer 
                    track={state.currentTrack}
                    timeLeft={state.timeLeft}
                    totalTimeLimit={state.totalTimeLimit}
                    difficulty={state.difficulty}
                    isHost={true}
                  />
                </div>
              )}
              
              <div style={{ marginTop: '20px' }}>
                <button 
                  className="btn"
                  onClick={handleNextRound}
                  disabled={state.timeLeft > 0}
                >
                  Next Round
                </button>
                
                <button 
                  className="btn btn-danger"
                  onClick={handleEndGame}
                  style={{ marginLeft: '10px' }}
                >
                  End Game
                </button>
              </div>
            </div>
          </div>
          
          <div className="card">
            <Leaderboard players={state.leaderboard} />
          </div>
        </div>
      </div>
    );
  }

  if (state.gameStatus === 'gameFinished') {
    return (
      <div className="host-view">
        <div className="container">
          <div className="card" style={{ textAlign: 'center' }}>
            <h2>🎯 Game is Finished!</h2>
            <p style={{ fontSize: '18px', margin: '20px 0' }}>
              All rounds have been completed. Ready to see the final results?
            </p>
            {showRevealButton && (
              <div style={{ marginTop: '30px' }}>
                <button 
                  className="btn btn-success"
                  onClick={actions.revealResults}
                  style={{ marginRight: '10px' }}
                >
                  🏆 Reveal Results
                </button>
              </div>
            )}
            <div style={{ marginTop: '30px' }}>
              <button 
                className="btn btn-danger"
                onClick={handleEndGame}
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.gameStatus === 'finished') {
    return (
      <div className="host-view">
        <div className="container">
          <div className="card" style={{ textAlign: 'center' }}>
            <h2>🏆 Game Over!</h2>
            <Leaderboard players={state.leaderboard} showFinal={true} />
            
            <div style={{ marginTop: '30px' }}>
              <button 
                className="btn"
                onClick={() => navigate('/')}
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.gameStatus === 'playing' && showAutoNextMsg && state.timeLeft === 0 && state.currentRound < state.totalRounds) {
    const nextRoundDelay = state.difficulty === 'hard' ? 11 : 6;
    return (
      <div style={{ color: '#667eea', fontWeight: 'bold', margin: '20px 0', fontSize: '18px', textAlign: 'center' }}>
        Next round will start automatically in {nextRoundDelay} seconds...
      </div>
    );
  }

  return (
    <div className="loading">
      <div className="spinner"></div>
    </div>
  );
}

export default HostView;