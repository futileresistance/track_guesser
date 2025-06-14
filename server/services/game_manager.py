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
    
    async def create_game(self, host_socket_id: str, difficulty: str = 'medium') -> Tuple[str, str]:
        game_id = self.generate_game_id()
        host_id = str(uuid.uuid4())
        
        # Set time limit based on difficulty
        time_limits = {
            'easy': 30,
            'medium': 15,
            'hard': 5
        }
        time_limit = time_limits.get(difficulty, 15)  # Default to medium if invalid
        
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
            'time_limit': time_limit,
            'difficulty': difficulty,
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
        
        # Add 5 extra seconds for hard mode
        effective_time_limit = game['time_limit']
        if game.get('difficulty') == 'hard':
            effective_time_limit += 5
        
        if time_elapsed > effective_time_limit:
            raise ValueError('Time limit exceeded')
        
        player['current_guess'] = guess
        player['guess_time'] = time_elapsed
        
        # Calculate score based on artist and track name matching
        score_result = self.calculate_guess_score(guess, game['current_track'])
        
        if score_result['total_score'] > 0:
            # Calculate speed bonus (faster = more bonus)
            speed_bonus = max(0, game['time_limit'] - time_elapsed)
            speed_multiplier = 1 + (speed_bonus / game['time_limit']) * 0.5  # Up to 50% bonus
            
            # Base points: 500 for perfect match, scaled down for partial matches
            base_points = round(500 * score_result['total_score'])
            final_points = round(base_points * speed_multiplier)
            
            player['score'] += final_points
            if score_result['total_score'] >= 0.8:  # Consider it a "correct" guess if 80%+ accurate
                player['correct_guesses'] += 1
            
            return {
                'correct': score_result['total_score'] >= 0.8,
                'points': final_points,
                'new_score': player['score'],
                'artist_score': score_result['artist_score'],
                'track_score': score_result['track_score'],
                'total_score': score_result['total_score'],
                'speed_bonus': round((speed_multiplier - 1) * 100, 1)  # Percentage bonus
            }
        
        return {
            'correct': False,
            'points': 0,
            'new_score': player['score'],
            'artist_score': score_result['artist_score'],
            'track_score': score_result['track_score'],
            'total_score': score_result['total_score'],
            'speed_bonus': 0
        }
    
    def calculate_guess_score(self, guess: str, track: dict) -> dict:
        """
        Calculate score based on artist and track name matching.
        Returns a dict with artist_score (0 or 1), track_score (0.0-1.0), and total_score (0.0-1.0).
        """
        def normalize(s: str) -> str:
            return ''.join(c.lower() for c in s if c.isalnum() or c.isspace()).strip()
        
        def calculate_word_similarity(guess_words: list, target_words: list) -> float:
            """Calculate similarity between two lists of words."""
            if not target_words:
                return 0.0
            if not guess_words:
                return 0.0
            
            # Count how many target words are found in guess words
            matching_words = 0
            for target_word in target_words:
                for guess_word in guess_words:
                    # Check if words are similar (one contains the other or they're very similar)
                    if (target_word in guess_word or 
                        guess_word in target_word or 
                        self._words_are_similar(target_word, guess_word)):
                        matching_words += 1
                        break
            
            return matching_words / len(target_words)
        
        normalized_guess = normalize(guess)
        guess_words = normalized_guess.split()
        
        # Get artist names from track
        artist_names = [artist['name'] for artist in track['artists']]
        track_name = track['name']
        
        # Calculate artist score (1 if any artist is correctly identified)
        artist_score = 0
        for artist_name in artist_names:
            normalized_artist = normalize(artist_name)
            artist_words = normalized_artist.split()
            
            # Check if artist name is found in guess
            if normalized_artist in normalized_guess or normalized_guess in normalized_artist:
                artist_score = 1
                break
            
            # Check word-by-word similarity for artist
            if calculate_word_similarity(guess_words, artist_words) >= 0.7:
                artist_score = 1
                break
        
        # Calculate track name score (0.0-1.0 based on word matching)
        normalized_track = normalize(track_name)
        track_words = normalized_track.split()
        
        # Exact match gets full points
        if normalized_track == normalized_guess:
            track_score = 1.0
        else:
            # Calculate word similarity
            track_score = calculate_word_similarity(guess_words, track_words)
            
            # Bonus for partial matches
            if track_score > 0:
                # If we have some matches, give a small bonus for being close
                track_score = min(1.0, track_score + 0.1)
        
        # Calculate total score: 40% artist + 60% track name
        total_score = (artist_score * 0.4) + (track_score * 0.6)
        
        return {
            'artist_score': artist_score,
            'track_score': track_score,
            'total_score': total_score
        }
    
    def _words_are_similar(self, word1: str, word2: str) -> bool:
        """Check if two words are similar (for typos, etc.)."""
        if len(word1) < 3 or len(word2) < 3:
            return word1 == word2
        
        # Simple similarity check - if words are very similar in length and content
        if abs(len(word1) - len(word2)) <= 1:
            # Count common characters
            common_chars = sum(1 for c in word1 if c in word2)
            similarity = common_chars / max(len(word1), len(word2))
            return similarity >= 0.8
        
        return False
    
    def is_guess_correct(self, guess: str, correct_title: str) -> bool:
        # Keep this for backward compatibility, but it's deprecated
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