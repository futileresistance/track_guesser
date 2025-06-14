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
                Game will start automatically when all players are ready and have enough tracks!
              </p>
            </div>
            
            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button 
                className={`btn ${canStartGame ? 'btn-success' : ''}`}
                disabled={!canStartGame}
                style={{ marginRight: '10px' }}
              >
                {canStartGame ? '🚀 Starting...' : '⏳ Waiting...'}
              </button>
              
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

  return (
    <div className="loading">
      <div className="spinner"></div>
    </div>
  );
}

export default HostView;