import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TrackSearch({ onTrackAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewAudio, setPreviewAudio] = useState(null);
  const [playingTrackId, setPlayingTrackId] = useState(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        searchTracks(query);
      } else {
        setResults([]);
      }
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [query]);

  const searchTracks = async (searchQuery) => {
    console.log('🔍 Searching for tracks:', searchQuery);
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/deezer/search', {
        params: { q: searchQuery, limit: 10 }
      });
      
      console.log('✅ Search response:', response.data);
      setResults(response.data.tracks || []);
    } catch (err) {
      console.error('❌ Search error:', err);
      setError('Failed to search tracks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackAdd = (track) => {
    console.log('➕ Adding track:', track);
    
    // Check if track has preview URL
    if (!track.preview_url) {
      alert('This track doesn\'t have a preview available. Please choose another.');
      return;
    }
    
    onTrackAdd(track);
    setQuery('');
    setResults([]);
  };

  const handlePreview = (track) => {
    if (playingTrackId === track.id) {
      // Stop current preview
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.currentTime = 0;
        setPreviewAudio(null);
      }
      setPlayingTrackId(null);
    } else {
      // Stop any currently playing preview
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.currentTime = 0;
      }
      
      // Start new preview
      const audio = new Audio(track.preview_url);
      audio.addEventListener('ended', () => {
        setPlayingTrackId(null);
        setPreviewAudio(null);
      });
      
      audio.play().catch(err => {
        console.error('Failed to play preview:', err);
        alert('Failed to play preview. Please try again.');
      });
      
      setPreviewAudio(audio);
      setPlayingTrackId(track.id);
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  return (
    <div className="track-search">
      <h3>🔍 Search for Tracks</h3>
      
      <input
        type="text"
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for songs, artists, or albums..."
      />
      
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      )}
      
      {error && (
        <div className="status-message status-error">
          {error}
        </div>
      )}
      
      {results.length > 0 && (
        <div className="search-results">
          {results.map((track) => (
            <div 
              key={track.id} 
              className="track-item"
              onClick={() => handleTrackAdd(track)}
            >
              {track.album?.images?.[2] && (
                <img 
                  src={track.album.images[2].url} 
                  alt={`${track.album.name} cover`}
                />
              )}
              
              <div className="track-details">
                <div className="track-title">{track.name}</div>
                <div className="track-artist">
                  {track.artists.map(artist => artist.name).join(', ')}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {track.album.name} • {formatDuration(track.duration_ms)}
                  {!track.preview_url && ' • No preview'}
                </div>
              </div>
              
              <div className="track-actions">
                {track.preview_url ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn" 
                      style={{ 
                        padding: '5px 10px', 
                        fontSize: '14px',
                        backgroundColor: playingTrackId === track.id ? '#ff6b6b' : '#4CAF50'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(track);
                      }}
                    >
                      {playingTrackId === track.id ? '⏹️ Stop' : '▶️ Preview'}
                    </button>
                    <button 
                      className="btn" 
                      style={{ padding: '5px 10px', fontSize: '14px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackAdd(track);
                      }}
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <span style={{ color: '#999', fontSize: '12px' }}>No preview</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {query && !loading && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          No tracks found. Try a different search term.
        </div>
      )}
      
      <div className="search-tips" style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>💡 Tips:</strong></p>
        <ul style={{ textAlign: 'left', paddingLeft: '20px' }}>
          <li>Search by song title, artist name, or album</li>
          <li>Only songs with previews can be added</li>
          <li>Popular songs usually have better previews</li>
        </ul>
      </div>
    </div>
  );
}

export default TrackSearch;