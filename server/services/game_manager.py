import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
from services.supabase_client import supabase
import random

class GameManager:
    def __init__(self):
        self.games: Dict[str, dict] = {}
        self.player_sockets: Dict[str, dict] = {}
    
    def generate_game_id(self) -> str:
        """Generate a 6-character alphanumeric game ID."""
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        return ''.join(random.choice(chars) for _ in range(6))
    
    async def create_game(self, host_socket_id: str) -> Tuple[str, str]:
        game_id = self.generate_game_id()
        host_id = str(uuid.uuid4())
        
        game = {
            'id': game_id,
            'host_id': host_id,
            'host_socket_id': host_socket_id,
            'status': 'lobby',
            'players': [],
            'tracks': [],
            'current_track': None,
            'current_round': 0,
            'total_rounds': 0,
            'round_start_time': None,
            'time_limit': 15,
            'created_at': datetime.now(timezone.utc)
        }
        
        self.games[game_id] = game
        self.player_sockets[host_socket_id] = {
            'game_id': game_id,
            'player_id': host_id,
            'is_host': True
        }
        
        try:
            supabase.table('games').insert({
                'id': game_id,
                'host_id': host_id,
                'status': 'lobby',
                'created_at': game['created_at'].isoformat()
            }).execute()
        except Exception as e:
            print(f'Error saving game to database: {e}')
        
        return game_id, host_id
    
    async def join_game(self, game_id: str, player_name: str, socket_id: str) -> dict:
        game = self.games.get(game_id)
        if not game:
            raise ValueError('Game not found')
        
        if game['status'] != 'lobby':
            raise ValueError('Game already started')
        
        if len(game['players']) >= 8:
            raise ValueError('Game is full')
        
        player_id = str(uuid.uuid4())
        player = {
            'id': player_id,
            'name': player_name,
            'socket_id': socket_id,
            'score': 0,
            'correct_guesses': 0,
        }
        
        game['players'].append(player)
        self.player_sockets[socket_id] = {
            'game_id': game_id,
            'player_id': player_id,
            'is_host': False
        }
        
        try:
            supabase.table('players').insert({
                'id': player_id,
                'game_id': game_id,
                'name': player_name,
                'score': 0
            }).execute()
        except Exception as e:
            print(f'Error saving player to database: {e}')

        return {
            'player_id': player_id,
            'player': player,
            'players': game['players']
        }
    
    def add_track(self, game_id: str, track: dict, player_id: str) -> List[dict]:
        game = self.games.get(game_id)
        if not game:
            raise ValueError('Game not found')
        
        if game['status'] != 'lobby':
            raise ValueError('Cannot add tracks after game started')
        
        player_tracks = [t for t in game['tracks'] if t['added_by'] == player_id]
        if len(player_tracks) >= 10:
            raise ValueError('Maximum tracks per player reached')
        
        game_track = {
            'id': track['id'],
            'name': track['name'],
            'artists': track['artists'],
            'album': track['album'],
            'preview_url': track['preview_url'],
            'duration_ms': track['duration_ms'],
            'added_by': player_id,
            #'added_at': datetime.now(timezone.utc)
        }
        
        game['tracks'].append(game_track)
        return game['tracks']
    
    async def start_game(self, game_id: str) -> dict:
        game = self.games.get(game_id)
        if not game:
            raise ValueError('Game not found')
        
        if game['status'] != 'lobby':
            raise ValueError('Game already started')
        
        if len(game['players']) < 2:
            raise ValueError('Need at least 2 players to start')
        
        # Shuffle tracks (even if empty, game can still start)
        if game['tracks']:
            game['tracks'] = random.sample(game['tracks'], len(game['tracks']))
            game['total_rounds'] = min(len(game['tracks']), 20)
        else:
            game['total_rounds'] = 0
        
        game['status'] = 'playing'
        
        try:
            supabase.table('games').update({
                'status': 'playing',
                'total_rounds': game['total_rounds']
            }).eq('id', game_id).execute()
        except Exception as e:
            print(f'Error updating game status: {e}')
        
        return {
            'status': 'playing',
            'total_rounds': game['total_rounds']
        }
    
    def start_next_round(self, game_id: str) -> dict:
        game = self.games.get(game_id)
        if not game:
            raise ValueError('Game not found')
        
        if game['current_round'] >= game['total_rounds']:
            # Return a special response indicating game is finished
            # The caller should handle this by calling end_game separately
            return {
                'game_finished': True,
                'current_round': game['current_round'],
                'total_rounds': game['total_rounds']
            }
        
        game['current_round'] += 1
        game['current_track'] = game['tracks'][game['current_round'] - 1]
        game['round_start_time'] = datetime.now(timezone.utc)
        
        # Reset player guesses
        for player in game['players']:
            player['current_guess'] = None
            player['guess_time'] = None
        
        return {
            'game_finished': False,
            'current_round': game['current_round'],
            'total_rounds': game['total_rounds'],
            'track': {
                'id': game['current_track']['id'],
                'preview_url': game['current_track']['preview_url'],
                'album': game['current_track']['album']
            },
            'time_limit': game['time_limit']
        }
    
    def submit_guess(self, game_id: str, player_id: str, guess: str) -> dict:
        game = self.games.get(game_id)
        if not game:
            raise ValueError('Game not found')
        
        player = next((p for p in game['players'] if p['id'] == player_id), None)
        if not player:
            raise ValueError('Player not found')
        
        if player.get('current_guess'):
            raise ValueError('Already submitted guess for this round')
        
        now = datetime.now(timezone.utc)
        time_elapsed = (now - game['round_start_time']).total_seconds()
        
        if time_elapsed > game['time_limit']:
            raise ValueError('Time limit exceeded')
        
        player['current_guess'] = guess
        player['guess_time'] = time_elapsed
        
        is_correct = self.is_guess_correct(guess, game['current_track']['name'])
        
        if is_correct:
            speed_bonus = max(0, game['time_limit'] - time_elapsed)
            points = round(500 + (speed_bonus / game['time_limit']) * 500)
            player['score'] += points
            player['correct_guesses'] += 1
            return {'correct': True, 'points': points, 'new_score': player['score']}
        
        return {'correct': False, 'points': 0, 'new_score': player['score']}
    
    def is_guess_correct(self, guess: str, correct_title: str) -> bool:
        def normalize(s: str) -> str:
            return ''.join(c.lower() for c in s if c.isalnum() or c.isspace()).strip()
        
        normalized_guess = normalize(guess)
        normalized_title = normalize(correct_title)
        
        if normalized_guess == normalized_title:
            return True
        
        guess_words = normalized_guess.split()
        title_words = normalized_title.split()
        
        if len(title_words) == 1:
            return title_words[0] in normalized_guess or normalized_guess in title_words[0]
        
        matching_words = sum(
            1 for word in title_words
            if any(word in gw or gw in word for gw in guess_words)
        )
        
        return matching_words >= len(title_words) * 0.6
    
    def get_leaderboard(self, game_id: str) -> List[dict]:
        game = self.games.get(game_id)
        if not game:
            raise ValueError('Game not found')
        
        return sorted(
            [
                {
                    'id': p['id'],
                    'name': p['name'],
                    'score': p['score'],
                    'correct_guesses': p['correct_guesses']
                }
                for p in game['players']
            ],
            key=lambda x: x['score'],
            reverse=True
        )
    
    async def end_game(self, game_id: str) -> dict:
        game = self.games.get(game_id)
        if not game:
            raise ValueError('Game not found')
        
        game['status'] = 'finished'
        leaderboard = self.get_leaderboard(game_id)
        
        try:
            supabase.table('games').update({
                'status': 'finished',
                'ended_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', game_id).execute()
        except Exception as e:
            print(f'Error updating game status: {e}')
        
        return {
            'status': 'finished',
            'leaderboard': leaderboard
        }
    
    async def remove_player(self, socket_id: str) -> Optional[dict]:
        player_info = self.player_sockets.get(socket_id)
        if not player_info:
            return None
        
        game_id = player_info['game_id']
        player_id = player_info['player_id']
        is_host = player_info['is_host']
        
        game = self.games.get(game_id)
        if not game:
            self.player_sockets.pop(socket_id, None)
            return None
        
        if is_host:
            self.games.pop(game_id, None)
            return {'game_id': game_id, 'game_ended': True}
        else:
            game['players'] = [p for p in game['players'] if p['id'] != player_id]
            self.player_sockets.pop(socket_id, None)
            return {
                'game_id': game_id,
                'players': game['players'],
                'game_ended': False
            }
    
    def get_game(self, game_id: str) -> Optional[dict]:
        return self.games.get(game_id)
    
    def get_player_info(self, socket_id: str) -> Optional[dict]:
        return self.player_sockets.get(socket_id)