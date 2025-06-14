import React, { useRef, useEffect, useState } from 'react';

function AudioPlayer({ track, timeLeft, isHost }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);

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
        {track.album?.images?.[1] && (
          <img 
            src={track.album.images[1].url} 
            alt="Album cover"
            style={{ 
              width: '150px', 
              height: '150px', 
              borderRadius: '10px',
              margin: '0 auto 20px'
            }}
          />
        )}
        
        {timeLeft === 0 && (
          <div>
            <h3>{track.name}</h3>
            <p>{Array.isArray(track.artists) ? track.artists.map(a => a.name).join(', ') : ''}</p>
            <p style={{ fontSize: '14px', color: '#666' }}>{track.album?.name}</p>
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
        
        <div className="playback-controls">
          <button 
            className="btn"
            onClick={togglePlayPause}
            disabled={timeLeft === 0}
            style={{ 
              borderRadius: '50%', 
              width: '60px', 
              height: '60px',
              fontSize: '24px'
            }}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
        </div>
        
        <div className="time-display" style={{ margin: '15px 0' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
            Time Left: {timeLeft}s
          </span>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: duration ? `${(currentTime / duration) * 100}%` : '0%'
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
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
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