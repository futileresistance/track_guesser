import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import HostView from './components/HostView';
import PlayerView from './components/PlayerView';
import JoinGame from './components/JoinGame';
import { GameProvider } from './context/GameContext';
import './App.css';

function App() {
  return (
    <Router>
      <GameProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/host/:gameId" element={<HostView />} />
            <Route path="/player/:gameId" element={<PlayerView />} />
            <Route path="/join" element={<JoinGame />} />
          </Routes>
        </div>
      </GameProvider>
    </Router>
  );
}

export default App;