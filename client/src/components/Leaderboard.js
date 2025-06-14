import React from 'react';

function Leaderboard({ players = [], showFinal = false }) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getPositionEmoji = (position) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${position}`;
    }
  };

  const getPositionClass = (position) => {
    switch (position) {
      case 1: return 'first';
      case 2: return 'second';
      case 3: return 'third';
      default: return '';
    }
  };

  return (
    <div className="leaderboard">
      <h3>
        {showFinal ? '🏆 Final Results' : '📊 Leaderboard'}
      </h3>
      
      {sortedPlayers.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
          No scores yet
        </div>
      ) : (
        <div className="leaderboard-list">
          {sortedPlayers.map((player, index) => {
            const position = index + 1;
            return (
              <div 
                key={player.id} 
                className={`leaderboard-item ${getPositionClass(position)}`}
              >
                <div className="player-info">
                  <span className="position">
                    {getPositionEmoji(position)}
                  </span>
                  <span className="player-name">
                    {player.name}
                  </span>
                </div>
                
                <div className="player-stats">
                  <span className="score">
                    {player.score} pts
                  </span>
                  {player.correct_guesses !== undefined && (
                    <span className="correct-guesses" style={{ 
                      fontSize: '12px', 
                      color: '#666',
                      marginLeft: '10px'
                    }}>
                      {player.correct_guesses} correct
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {showFinal && sortedPlayers.length > 0 && (
        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          background: '#f8f9fa',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <h4>🎉 Congratulations!</h4>
          <p>
            <strong>{sortedPlayers[0]?.name}</strong> wins with {sortedPlayers[0]?.score} points!
          </p>
          
          {sortedPlayers.length > 1 && (
            <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
              <p>Great job to all players:</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {sortedPlayers.slice(1).map((player, index) => (
                  <li key={player.id}>
                    {getPositionEmoji(index + 2)} {player.name} - {player.score} pts
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {!showFinal && (
        <div style={{ 
          marginTop: '20px', 
          fontSize: '12px', 
          color: '#666',
          textAlign: 'center'
        }}>
          Points awarded for correct and fast answers
        </div>
      )}
    </div>
  );
}

export default Leaderboard;