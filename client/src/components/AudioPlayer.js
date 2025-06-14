import React, { useRef, useEffect, useState } from 'react';

function AudioPlayer({ track, timeLeft, isHost, totalTimeLimit = 15, difficulty = 'medium' }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [gradient, setGradient] = useState('');

  // Calculate effective time limit (add 5 seconds for hard mode)
  const effectiveTimeLimit = difficulty === 'hard' ? totalTimeLimit + 5 : totalTimeLimit;

  // Generate random gradient colors
  const generateRandomGradient = () => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    
    const color1 = colors[Math.floor(Math.random() * colors.length)];
    const color2 = colors[Math.floor(Math.random() * colors.length)];
    const angle = Math.floor(Math.random() * 360);
    
    return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
  };

  useEffect(() => {
    // Generate new gradient when track changes
    setGradient(generateRandomGradient());
  }, [track]);

  useEffect(() => {
    if (track && audioRef.current) {
      audioRef.current.src = track.preview_url;
      audioRef.current.load();
      
      if (isHost) {
        // Auto-play for host
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    }
  }, [track, isHost]);

  useEffect(() => {
    // Stop playing when time is up
    if (timeLeft === 0 && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [timeLeft]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    if (!audioRef.current || timeLeft === 0) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!track) {
    return (
      <div className="audio-player">
        <p>Waiting for next track...</p>
      </div>
    );
  }

  return (
    <div className="audio-player">
      <div className="track-info">
        <div 
          style={{ 
            width: '150px', 
            height: '150px', 
            borderRadius: '10px',
            margin: '0 auto 20px',
            background: gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            color: 'rgba(255, 255, 255, 0.8)',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
          }}
        >
          <span className="vibrate-note">🎵</span>
        </div>
        
        {timeLeft === 0 && (
          <div>
            <h3>{track.name}</h3>
            <p>{Array.isArray(track.artists) ? track.artists.map(a => a.name).join(', ') : ''}</p>
            <p style={{ fontSize: '14px', color: '#666' }}></p>
          </div>
        )}
      </div>
      
      <div className="audio-controls">
        <audio 
          ref={audioRef}
          volume={volume}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        <div className="time-display" style={{ margin: '15px 0' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
            Time Left: {timeLeft}s
            {difficulty === 'hard' && (
              <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
                (+5s submission time)
              </span>
            )}
          </span>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${((effectiveTimeLimit - timeLeft) / effectiveTimeLimit) * 100}%`,
              backgroundColor: timeLeft <= 5 ? '#dc3545' : timeLeft <= 10 ? '#ffc107' : '#28a745'
            }}
          ></div>
        </div>
        
        <div className="time-info" style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '14px',
          color: '#666',
          marginTop: '5px'
        }}>
          <span>Time Used: {effectiveTimeLimit - timeLeft}s</span>
          <span>Total: {effectiveTimeLimit}s</span>
        </div>
        
        {isHost && (
          <div className="volume-control" style={{ marginTop: '15px' }}>
            <label style={{ fontSize: '14px', marginRight: '10px' }}>🔊</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              style={{ width: '100px' }}
            />
          </div>
        )}
      </div>
      
      {!track.preview_url && (
        <div className="status-message status-error">
          No preview available for this track
        </div>
      )}
    </div>
  );
}

export default AudioPlayer;