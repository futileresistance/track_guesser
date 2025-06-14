from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from services.spotify_service import SpotifyService

router = APIRouter()
spotify_service = SpotifyService()

@router.get('/search')
async def search_tracks(q: str, limit: int = Query(default=20, le=50)):
    try:
        if not q or not q.strip():
            raise HTTPException(
                status_code=400,
                detail='Search query is required'
            )
        
        if not spotify_service.is_configured():
            raise HTTPException(
                status_code=503,
                detail='Spotify API not configured. Please check environment variables.'
            )
        
        results = spotify_service.search_tracks(q, limit)
        
        return {
            'tracks': results['tracks'],
            'total': results['total'],
            'query': q
        }
    
    except Exception as e:
        print(f'Spotify search error: {e}')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to search tracks: {str(e)}'
        )

@router.get('/track/{track_id}')
async def get_track(track_id: str):
    try:
        if not spotify_service.is_configured():
            raise HTTPException(
                status_code=503,
                detail='Spotify API not configured'
            )
        
        track = spotify_service.get_track(track_id)
        return {'track': track}
    
    except Exception as e:
        print(f'Get track error: {e}')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to get track: {str(e)}'
        )

@router.get('/popular')
async def get_popular_tracks(limit: int = Query(default=50, le=100)):
    try:
        if not spotify_service.is_configured():
            raise HTTPException(
                status_code=503,
                detail='Spotify API not configured'
            )
        
        tracks = spotify_service.get_popular_tracks(limit)
        return {'tracks': tracks}
    
    except Exception as e:
        print(f'Get popular tracks error: {e}')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to get popular tracks: {str(e)}'
        )

@router.post('/recommendations')
async def get_recommendations(
    seed_tracks: List[str],
    limit: int = Query(default=20, le=50)
):
    try:
        if not spotify_service.is_configured():
            raise HTTPException(
                status_code=503,
                detail='Spotify API not configured'
            )
        
        tracks = spotify_service.get_recommendations(seed_tracks, limit)
        return {'tracks': tracks}
    
    except Exception as e:
        print(f'Get recommendations error: {e}')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to get recommendations: {str(e)}'
        )

@router.get('/status')
def get_status():
    return {
        'configured': spotify_service.is_configured(),
        'client_id': 'Set' if spotify_service.client_id else 'Not set',
        'client_secret': 'Set' if spotify_service.client_secret else 'Not set'
    }