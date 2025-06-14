from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict
from services.supabase_client import supabase

router = APIRouter()

@router.get('/{game_id}')
async def get_game(game_id: str):
    try:
        response = await supabase.table('games').select("""
            id,
            host_id,
            status,
            created_at,
            ended_at,
            total_rounds,
            players (id, name, score)
        """).eq('id', game_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail='Game not found')
        
        return {'game': response.data}
    
    except Exception as e:
        print(f'Get game error: {e}')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to get game: {str(e)}'
        )

@router.get('/')
async def get_recent_games(limit: int = 10):
    try:
        response = await supabase.table('games').select("""
            id,
            status,
            created_at,
            ended_at,
            total_rounds,
            players (id, name, score)
        """).order('created_at', desc=True).limit(limit).execute()
        
        return {'games': response.data}
    
    except Exception as e:
        print(f'Get games error: {e}')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to get games: {str(e)}'
        )

@router.get('/{game_id}/leaderboard')
async def get_leaderboard(game_id: str):
    try:
        response = await supabase.table('players')\
            .select('id, name, score')\
            .eq('game_id', game_id)\
            .order('score', desc=True)\
            .execute()
        
        return {'leaderboard': response.data}
    
    except Exception as e:
        print(f'Get leaderboard error: {e}')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to get leaderboard: {str(e)}'
        )

@router.get('/player/{player_id}')
async def get_player_stats(player_id: str):
    try:
        # Get player data
        player_response = await supabase.table('players').select("""
            id,
            name,
            score,
            game_id,
            games!inner (status, created_at, ended_at)
        """).eq('id', player_id).single().execute()
        
        if not player_response.data:
            raise HTTPException(status_code=404, detail='Player not found')
        
        # Get player's game history
        history_response = await supabase.table('players')\
            .select('id, name, score, game_id')\
            .eq('name', player_response.data['name'])\
            .neq('id', player_id)\
            .order('created_at', desc=True)\
            .execute()
        
        return {
            'player': player_response.data,
            'history': history_response.data or []
        }
    
    except Exception as e:
        print(f'Get player stats error: {e}')
        raise HTTPException(
            status_code=500,
            detail=f'Failed to get player stats: {str(e)}'
        )