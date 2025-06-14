import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';

function JoinGame() {
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, actions } = useGame();
  const [error, setError] = useState('');

  useEffect(() => {
    // Pre-fill game ID from URL params (QR code scan)
    const urlGameId = searchParams.get('gameId');
    if (urlGameId) {
      setGameId(urlGameId.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    // Navigate to player view when successfully joined
    if (state.gameId && state.playerId && !state.isHost && !state.loading) {
      navigate(`/player/${state.gameId}`);
    }
  }, [state.gameId, state.playerId, state.isHost, state.loading, navigate]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!gameId) {
      setError('Game ID is required');
      return;
    }

    // Add random suffix for testing multiple players
    const randomSuffix = Math.floor(Math.random() * 1000);
    const testPlayerName = `${playerName.trim()}_${randomSuffix}`;
    
    console.log(`🎮 Joining game as: ${testPlayerName}`);
    actions.joinGame(gameId, testPlayerName);
  };

  const handleCreateNew = () => {
    navigate('/');
  };

  const handleGameIdChange = (e) => {
    // Auto-uppercase and limit to 6 characters
    const value = e.target.value.toUpperCase().slice(0, 6);
    setGameId(value);
  };

  return (
    <div className="home">
      <div className="container">
        <div className="card" style={{ maxWidth: '400px', margin: '50px auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Join Game</h2>
          
          {state.error && (
            <div className="status-message status-error">
              {state.error}
            </div>
          )}
          
          <form onSubmit={handleJoin}>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="gameId" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Game ID
              </label>
              <input
                type="text"
                id="gameId"
                className="search-input"
                value={gameId}
                onChange={handleGameIdChange}
                placeholder="Enter 6-character game ID"
                required
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '3px' }}
              />
            </div>
            
            <div style={{ marginBottom: '30px' }}>
              <label htmlFor="playerName" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                className="search-input"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                required
                maxLength="20"
              />
            </div>
            
            {error && (
              <div className="status-message status-error" style={{ marginBottom: '15px' }}>
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              className="btn" 
              style={{ width: '100%' }}
              disabled={state.loading || !gameId.trim() || !playerName.trim()}
            >
              {state.loading ? 'Joining...' : '🎮 Join Game'}
            </button>
          </form>
          
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handleCreateNew}
              style={{ background: 'transparent', color: '#667eea' }}
            >
              ← Back to Home
            </button>
          </div>
        </div>
        
        <div className="card" style={{ maxWidth: '400px', margin: '20px auto', textAlign: 'center' }}>
          <h4>💡 Tip</h4>
          <p>Scan the QR code from the host's screen to automatically fill the Game ID!</p>
        </div>
        
        {/* Debug info */}
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
          <p><strong>Debug Info:</strong></p>
          <p>• Random suffix will be added to player name for testing</p>
          <p>• Use incognito window for true multi-player testing</p>
          <p>• Or use the "Clear Storage" button on home page</p>
        </div>
      </div>
    </div>
  );
}

export default JoinGame;