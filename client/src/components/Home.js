import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

function Home() {
  const navigate = useNavigate();
  const { actions } = useGame();

  const handleCreateGame = () => {
    actions.createGame();
    // Navigation will be handled by socket response
  };

  const handleJoinGame = () => {
    navigate('/join');
  };

  const handleClearStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="home">
      <div className="container">
        <h1>🎵 Tune Guesser</h1>
        <p style={{ color: 'white', fontSize: '1.2rem', marginBottom: '40px' }}>
          The ultimate music guessing game for friends
        </p>
        
        <div className="home-buttons">
          <button className="btn" onClick={handleCreateGame}>
            🎮 Create Game
          </button>
          <button className="btn btn-secondary" onClick={handleJoinGame}>
            📱 Join Game
          </button>
        </div>
        
        {/* Debug button for testing */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button 
            className="btn btn-danger" 
            onClick={handleClearStorage}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            🧹 Clear Storage (Debug)
          </button>
        </div>
        
        <div className="card" style={{ marginTop: '60px', maxWidth: '600px', margin: '60px auto 0' }}>
          <h3>How to Play</h3>
          <div style={{ textAlign: 'left', marginTop: '20px' }}>
            <p><strong>1. Create or Join:</strong> Host creates a game, players scan QR code to join</p>
            <p><strong>2. Add Tracks:</strong> Each player searches and adds 5-10 songs</p>
            <p><strong>3. Guess & Win:</strong> Listen to 15-second snippets and guess the song</p>
            <p><strong>4. Compete:</strong> Earn points for correct and fast answers</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;