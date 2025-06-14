import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv

load_dotenv()

class SpotifyService:
    def __init__(self):
        self.client_id = os.getenv('SPOTIFY_CLIENT_ID')
        self.client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
        self.spotify = None
        self.token_expiration = None
        self.initialize_client()
    
    def initialize_client(self) -> None:
        try:
            auth_manager = SpotifyClientCredentials(
                client_id=self.client_id,
                client_secret=self.client_secret
            )
            self.spotify = spotipy.Spotify(auth_manager=auth_manager)
            self.token_expiration = datetime.now() + timedelta(hours=1)
            print('✅ Spotify API client initialized')
        except Exception as e:
            print(f'❌ Failed to initialize Spotify client: {e}')
    
    def ensure_valid_token(self) -> None:
        if not self.spotify or datetime.now() >= self.token_expiration - timedelta(minutes=5):
            self.initialize_client()
    
    def search_tracks(self, query: str, limit: int = 20) -> Dict:
        print(f'Searching for tracks: {query}')
        try:
            self.ensure_valid_token()
            
            results = self.spotify.search(
                q=query,
                type='track',
                limit=limit,
                market='US'
            )
            print(f'Search results: {results}')
            items = results.get('tracks', {}).get('items', [])
            tracks = [
                {
                    'id': track['id'],
                    'name': track['name'],
                    'artists': [
                        {'id': artist['id'], 'name': artist['name']}
                        for artist in track.get('artists', [])
                    ],
                    'album': {
                        'id': track['album']['id'],
                        'name': track['album']['name'],
                        'images': track['album'].get('images', [])
                    },
                    'preview_url': track.get('preview_url'),
                    'duration_ms': track.get('duration_ms'),
                    'popularity': track.get('popularity'),
                    'explicit': track.get('explicit')
                }
                for track in items
            ]
            
            # Filter tracks with preview URLs
            tracks_with_previews = [t for t in tracks if t['preview_url']]
            
            return {
                'tracks': tracks_with_previews,
                'total': results.get('tracks', {}).get('total', 0)
            }
        
        except Exception as e:
            print(f'Spotify search error: {e}')
            raise ValueError('Failed to search tracks')
    
    def get_track(self, track_id: str) -> Dict:
        try:
            self.ensure_valid_token()
            
            track = self.spotify.track(track_id)
            
            return {
                'id': track['id'],
                'name': track['name'],
                'artists': [
                    {'id': artist['id'], 'name': artist['name']}
                    for artist in track['artists']
                ],
                'album': {
                    'id': track['album']['id'],
                    'name': track['album']['name'],
                    'images': track['album']['images']
                },
                'preview_url': track['preview_url'],
                'duration_ms': track['duration_ms'],
                'popularity': track['popularity'],
                'explicit': track['explicit']
            }
        
        except Exception as e:
            print(f'Spotify get track error: {e}')
            raise ValueError('Failed to get track')
    
    def get_popular_tracks(self, limit: int = 50) -> List[Dict]:
        try:
            self.ensure_valid_token()
            
            # Get featured playlists
            playlists = self.spotify.featured_playlists(limit=5)['playlists']['items']
            tracks = []
            
            for playlist in playlists:
                try:
                    playlist_tracks = self.spotify.playlist_tracks(
                        playlist['id'],
                        limit=10
                    )
                    
                    for item in playlist_tracks['items']:
                        if item['track'] and item['track'].get('preview_url'):
                            track = item['track']
                            tracks.append({
                                'id': track['id'],
                                'name': track['name'],
                                'artists': [
                                    {'id': artist['id'], 'name': artist['name']}
                                    for artist in track['artists']
                                ],
                                'album': {
                                    'id': track['album']['id'],
                                    'name': track['album']['name'],
                                    'images': track['album']['images']
                                },
                                'preview_url': track['preview_url'],
                                'duration_ms': track['duration_ms'],
                                'popularity': track['popularity']
                            })
                
                except Exception as e:
                    print(f'Failed to get playlist tracks: {e}')
            
            # Remove duplicates and limit results
            unique_tracks = list({
                track['id']: track for track in tracks
            }.values())[:limit]
            
            return unique_tracks
        
        except Exception as e:
            print(f'Spotify get popular tracks error: {e}')
            raise ValueError('Failed to get popular tracks')
    
    def get_recommendations(self, seed_tracks: List[str], limit: int = 20) -> List[Dict]:
        try:
            self.ensure_valid_token()
            
            recommendations = self.spotify.recommendations(
                seed_tracks=seed_tracks[:5],
                limit=limit,
                market='US'
            )
            
            tracks = [
                {
                    'id': track['id'],
                    'name': track['name'],
                    'artists': [
                        {'id': artist['id'], 'name': artist['name']}
                        for artist in track['artists']
                    ],
                    'album': {
                        'id': track['album']['id'],
                        'name': track['album']['name'],
                        'images': track['album']['images']
                    },
                    'preview_url': track['preview_url'],
                    'duration_ms': track['duration_ms'],
                    'popularity': track['popularity']
                }
                for track in recommendations['tracks']
                if track.get('preview_url')
            ]
            
            return tracks
        
        except Exception as e:
            print(f'Spotify recommendations error: {e}')
            raise ValueError('Failed to get recommendations')
    
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)