import os
from typing import List, Dict, Optional
import requests
from dotenv import load_dotenv

load_dotenv()

class DeezerService:
    def __init__(self):
        self.base_url = "https://api.deezer.com"
        self.spotify = None  # Keep for compatibility
        self.token_expiration = None  # Keep for compatibility
        print('✅ Deezer API client initialized')
    
    def initialize_client(self) -> None:
        # Deezer API doesn't require authentication for basic operations
        # This method is kept for compatibility with existing code
        pass
    
    def ensure_valid_token(self) -> None:
        # Deezer API doesn't require token management
        # This method is kept for compatibility with existing code
        pass
    
    def search_tracks(self, query: str, limit: int = 20) -> Dict:
        print(f'Searching for tracks: {query}')
        try:
            response = requests.get(
                f"{self.base_url}/search",
                params={
                    'q': query,
                    'limit': limit
                }
            )
            response.raise_for_status()
            
            data = response.json()
            print(f'Search results: {data}')
            
            tracks = []
            for track in data.get('data', []):
                # Convert Deezer track format to match Spotify format
                track_data = {
                    'id': str(track['id']),
                    'name': track['title'],
                    'artists': [
                        {
                            'id': str(track['artist']['id']),
                            'name': track['artist']['name']
                        }
                    ],
                    'album': {
                        'id': str(track['album']['id']),
                        'name': track['album']['title'],
                        'images': [
                            {
                                'url': track['album']['cover'],
                                'width': 300,
                                'height': 300
                            },
                            {
                                'url': track['album']['cover_medium'],
                                'width': 250,
                                'height': 250
                            },
                            {
                                'url': track['album']['cover_small'],
                                'width': 120,
                                'height': 120
                            }
                        ]
                    },
                    'preview_url': track.get('preview'),
                    'duration_ms': track.get('duration', 0) * 1000,  # Convert seconds to ms
                    'popularity': track.get('rank', 0),
                    'explicit': False  # Deezer doesn't provide explicit info in search
                }
                tracks.append(track_data)
            
            # Filter tracks with preview URLs
            tracks_with_previews = [t for t in tracks if t['preview_url']]
            
            return {
                'tracks': tracks_with_previews,
                'total': data.get('total', 0)
            }
        
        except Exception as e:
            print(f'Deezer search error: {e}')
            raise ValueError('Failed to search tracks')
    
    def get_track(self, track_id: str) -> Dict:
        try:
            response = requests.get(f"{self.base_url}/track/{track_id}")
            response.raise_for_status()
            
            track = response.json()
            
            return {
                'id': str(track['id']),
                'name': track['title'],
                'artists': [
                    {
                        'id': str(track['artist']['id']),
                        'name': track['artist']['name']
                    }
                ],
                'album': {
                    'id': str(track['album']['id']),
                    'name': track['album']['title'],
                    'images': [
                        {
                            'url': track['album']['cover'],
                            'width': 300,
                            'height': 300
                        },
                        {
                            'url': track['album']['cover_medium'],
                            'width': 250,
                            'height': 250
                        },
                        {
                            'url': track['album']['cover_small'],
                            'width': 120,
                            'height': 120
                        }
                    ]
                },
                'preview_url': track.get('preview'),
                'duration_ms': track.get('duration', 0) * 1000,
                'popularity': track.get('rank', 0),
                'explicit': False
            }
        
        except Exception as e:
            print(f'Deezer get track error: {e}')
            raise ValueError('Failed to get track')
    
    def get_popular_tracks(self, limit: int = 50) -> List[Dict]:
        try:
            # Get popular tracks from Deezer charts
            response = requests.get(f"{self.base_url}/chart/0/tracks", params={'limit': limit})
            response.raise_for_status()
            
            data = response.json()
            tracks = []
            
            for track in data.get('data', []):
                if track.get('preview'):  # Only include tracks with previews
                    track_data = {
                        'id': str(track['id']),
                        'name': track['title'],
                        'artists': [
                            {
                                'id': str(track['artist']['id']),
                                'name': track['artist']['name']
                            }
                        ],
                        'album': {
                            'id': str(track['album']['id']),
                            'name': track['album']['title'],
                            'images': [
                                {
                                    'url': track['album']['cover'],
                                    'width': 300,
                                    'height': 300
                                },
                                {
                                    'url': track['album']['cover_medium'],
                                    'width': 250,
                                    'height': 250
                                },
                                {
                                    'url': track['album']['cover_small'],
                                    'width': 120,
                                    'height': 120
                                }
                            ]
                        },
                        'preview_url': track.get('preview'),
                        'duration_ms': track.get('duration', 0) * 1000,
                        'popularity': track.get('rank', 0)
                    }
                    tracks.append(track_data)
            
            return tracks
        
        except Exception as e:
            print(f'Deezer get popular tracks error: {e}')
            raise ValueError('Failed to get popular tracks')
    
    def get_recommendations(self, seed_tracks: List[str], limit: int = 20) -> List[Dict]:
        try:
            # Deezer doesn't have a direct recommendations endpoint like Spotify
            # We'll use the artist's top tracks as a fallback
            if not seed_tracks:
                return self.get_popular_tracks(limit)
            
            # Get the first seed track to find the artist
            first_track = self.get_track(seed_tracks[0])
            artist_id = first_track['artists'][0]['id']
            
            # Get artist's top tracks
            response = requests.get(f"{self.base_url}/artist/{artist_id}/top", params={'limit': limit})
            response.raise_for_status()
            
            data = response.json()
            tracks = []
            
            for track in data.get('data', []):
                if track.get('preview'):
                    track_data = {
                        'id': str(track['id']),
                        'name': track['title'],
                        'artists': [
                            {
                                'id': str(track['artist']['id']),
                                'name': track['artist']['name']
                            }
                        ],
                        'album': {
                            'id': str(track['album']['id']),
                            'name': track['album']['title'],
                            'images': [
                                {
                                    'url': track['album']['cover'],
                                    'width': 300,
                                    'height': 300
                                },
                                {
                                    'url': track['album']['cover_medium'],
                                    'width': 250,
                                    'height': 250
                                },
                                {
                                    'url': track['album']['cover_small'],
                                    'width': 120,
                                    'height': 120
                                }
                            ]
                        },
                        'preview_url': track.get('preview'),
                        'duration_ms': track.get('duration', 0) * 1000,
                        'popularity': track.get('rank', 0)
                    }
                    tracks.append(track_data)
            
            return tracks
        
        except Exception as e:
            print(f'Deezer recommendations error: {e}')
            # Fallback to popular tracks if recommendations fail
            return self.get_popular_tracks(limit)
    
    def is_configured(self) -> bool:
        # Deezer API doesn't require configuration
        return True 