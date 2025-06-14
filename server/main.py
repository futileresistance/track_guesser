import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import socketio
from datetime import datetime
import asyncio

from services.game_manager import GameManager
from routes import game_routes, deezer_routes

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Tune Guesser API",
    description="Backend server for Tune Guesser game",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Socket.IO
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=[os.getenv("CLIENT_URL", "http://localhost:3000")]
)
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Initialize game manager
game_manager = GameManager()

# Store active timers for each game
active_timers = {}

# Helper function to serialize player data
def serialize_player_data(players):
    return [
        {
            'id': p['id'],
            'name': p['name'],
            'score': p.get('score', 0),
            'correct_guesses': p.get('correct_guesses', 0)
        }
        for p in players
    ]

# Countdown timer function
async def start_countdown_timer(game_id: str, time_limit: int):
    """Start a countdown timer for a game round"""
    # Cancel any existing timer for this game
    if game_id in active_timers:
        active_timers[game_id].cancel()
    
    async def countdown():
        for time_left in range(time_limit, -1, -1):
            try:
                # Send time update to all players in the game
                await sio.emit('timeUpdate', {
                    "timeLeft": time_left
                }, room=game_id)
                
                if time_left > 0:
                    await asyncio.sleep(1)  # Wait 1 second
                else:
                    # Time's up! Send final update
                    print(f"⏰ Time's up for game {game_id}")
                    break
                    
            except asyncio.CancelledError:
                print(f"⏰ Timer cancelled for game {game_id}")
                break
            except Exception as e:
                print(f"❌ Error in countdown timer for game {game_id}: {e}")
                break
        
        # Clean up timer reference
        if game_id in active_timers:
            del active_timers[game_id]
    
    # Start the countdown task
    timer_task = asyncio.create_task(countdown())
    active_timers[game_id] = timer_task
    print(f"⏰ Started countdown timer for game {game_id} ({time_limit}s)")

# Include routers
app.include_router(game_routes.router, prefix="/api/game", tags=["game"])
app.include_router(deezer_routes.router, prefix="/api/deezer", tags=["deezer"])

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "OK"}

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    print(f"Socket connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Socket disconnected: {sid}")
    
    # Get player info before removing
    player_info = game_manager.get_player_info(sid)
    if player_info:
        game_id = player_info['game_id']
        
        # Remove player from game
        result = await game_manager.remove_player(sid)
        
        if result and result.get('game_ended'):
            # Game ended, notify all players
            await sio.emit('gameEnded', {"message": "Game ended by host."}, room=game_id)
        elif result:
            # Player left, update player list
            await sio.emit('playerListUpdate', {
                "players": result['players']
            }, room=game_id)
        
        # Leave the room
        await sio.leave_room(sid, game_id)

@sio.event
async def createGame(sid):
    try:
        print(f"CREATE GAME: {sid}")
        game_id, host_id = await game_manager.create_game(sid)
        
        # Join the socket to the game room
        await sio.enter_room(sid, game_id)
        
        await sio.emit('gameCreated', {"gameId": game_id, "hostId": host_id}, room=sid)
    except Exception as e:
        print(f"Error creating game: {e}")
        await sio.emit('error', {"message": "Failed to create game. Please try again."}, room=sid)

@sio.event
async def joinGame(sid, data):
    try:
        print(f"🎮 JOIN GAME REQUEST: {sid}")
        print(f"📋 Join data: {data}")
        
        game_id = data.get('gameId')
        player_name = data.get('playerName')
        if not game_id or not player_name:
            print(f"❌ Missing data: gameId={game_id}, playerName={player_name}")
            await sio.emit('error', {"message": "Game ID and Player Name are required."}, room=sid)
            return

        print(f"🔍 Looking for game: {game_id}")
        result = await game_manager.join_game(game_id, player_name, sid)
        print(f"✅ Join result: {result}")
        
        # Join the socket to the game room
        await sio.enter_room(sid, game_id)
        print(f"🏠 Socket {sid} joined room {game_id}")
        
        await sio.emit('playerJoined', {
            "playerId": result["player_id"],
            "gameId": game_id,
            "players": result["players"],
            "player": result["player"] # Send the new player object to the joining player
        }, room=sid)
        print(f"📤 Sent playerJoined event to {sid}")
        
        # Notify other players in the game room
        await sio.emit('playerListUpdate', { # Use a more specific event name
            "players": result["players"]
        }, room=game_id, skip_sid=sid)
        print(f"📤 Sent playerListUpdate to room {game_id}")
        
    except ValueError as ve:
        print(f"❌ Error joining game (ValueError): {ve}")
        await sio.emit('error', {"message": str(ve)}, room=sid)
    except Exception as e:
        print(f"❌ Error joining game: {e}")
        await sio.emit('error', {"message": "Failed to join game. Please try again."}, room=sid)

@sio.event
async def addTrack(sid, data):
    try:
        print(f"🎵 ADD TRACK REQUEST: {sid}")
        print(f"📋 Track data: {data}")
        
        game_id = data.get('gameId')
        track = data.get('track')
        player_id = data.get('playerId')
        
        if not game_id or not track or not player_id:
            print(f"❌ Missing data: gameId={game_id}, track={bool(track)}, playerId={player_id}")
            await sio.emit('error', {"message": "Game ID, Track, and Player ID are required."}, room=sid)
            return
            
        print(f"🔍 Adding track to game: {game_id}")
        print(f"🎵 Track details: {track.get('name', 'Unknown')} by {track.get('artists', [])}")
        
        # Add track to game using GameManager
        tracks = game_manager.add_track(game_id, track, player_id)
        print(f"✅ Track added successfully. Total tracks: {len(tracks)}")
        
        # Notify all players in the game
        await sio.emit('trackAdded', {
            "tracks": tracks
        }, room=game_id)
        print(f"📤 Sent trackAdded event to room {game_id}")
        
    except ValueError as ve:
        print(f"❌ Error adding track (ValueError): {ve}")
        await sio.emit('error', {"message": str(ve)}, room=sid)
    except Exception as e:
        print(f"❌ Error adding track: {e}")
        await sio.emit('error', {"message": "Failed to add track. Please try again."}, room=sid)

@sio.event
async def setReady(sid, data):
    try:
        print(f"📤 setReady event received from {sid}")
        print(f"📋 setReady data: {data}")
        
        game_id = data.get('gameId')
        player_id = data.get('playerId')
        is_ready = data.get('isReady')
        
        print(f"🔍 Parsed data: gameId={game_id}, playerId={player_id}, isReady={is_ready}")
        
        if not game_id or not player_id:
            print(f"❌ Missing required data: gameId={game_id}, playerId={player_id}")
            await sio.emit('error', {"message": "Game ID and Player ID are required."}, room=sid)
            return
            
        # Update player ready status
        game = game_manager.get_game(game_id)
        if not game:
            print(f"❌ Game not found: {game_id}")
            await sio.emit('error', {"message": "Game not found."}, room=sid)
            return
            
        print(f"🎮 Found game with {len(game['players'])} players")
        
        # Find and update player ready status
        player_found = False
        for player in game['players']:
            if player['id'] == player_id:
                player['ready'] = is_ready
                player_found = True
                print(f"✅ Updated player {player_id} ready status to {is_ready}")
                break
        
        if not player_found:
            print(f"❌ Player {player_id} not found in game")
            await sio.emit('error', {"message": "Player not found in game."}, room=sid)
            return
        
        # Get list of ready players
        ready_players = [p['id'] for p in game['players'] if p.get('ready', False)]
        print(f"📊 Ready players: {ready_players}")
        
        # Notify all players about ready status update
        print(f"📤 Emitting readyPlayersUpdate to room {game_id}")
        await sio.emit('readyPlayersUpdate', {
            "readyPlayers": ready_players
        }, room=game_id)
        
        # Check if game can start automatically
        min_players = 2
        total_players = len(game['players'])
        all_ready = len(ready_players) == total_players
        
        can_start = (
            total_players >= min_players and
            all_ready  # Only require all players to be ready
        )
        
        print(f"🚀 Game start check: total_players={total_players}, all_ready={all_ready}, can_start={can_start}")
        
        if can_start:
            # Auto-start the game
            print(f"🚀 Auto-starting game {game_id}")
            await startGame(sid, {"gameId": game_id})
        
    except Exception as e:
        print(f"❌ Error setting ready status: {e}")
        import traceback
        traceback.print_exc()
        await sio.emit('error', {"message": "Failed to update ready status. Please try again."}, room=sid)

@sio.event
async def startGame(sid, data):
    try:
        print(f"🚀 START GAME REQUEST: {sid}")
        game_id = data.get('gameId')
        
        if not game_id:
            await sio.emit('error', {"message": "Game ID is required."}, room=sid)
            return
            
        result = await game_manager.start_game(game_id)
        
        # Start the first round
        round_data = game_manager.start_next_round(game_id)
        
        # Check if game is already finished (no tracks)
        if round_data.get('game_finished', False):
            # End the game immediately
            end_result = await game_manager.end_game(game_id)
            await sio.emit('gameEnd', {
                "finalLeaderboard": end_result['leaderboard']
            }, room=game_id)
            return
        
        # Notify all players in the game
        await sio.emit('gameStarted', {
            "roundInfo": {
                "current": round_data['current_round'],
                "total": round_data['total_rounds']
            }
        }, room=game_id)
        
        # Send the first track to all players
        await sio.emit('newRound', {
            "track": round_data['track'],
            "roundInfo": {
                "current": round_data['current_round'],
                "total": round_data['total_rounds']
            },
            "timeLimit": round_data['time_limit']
        }, room=game_id)
        
        # Start the countdown timer for this round
        await start_countdown_timer(game_id, round_data['time_limit'])
        
        print(f"✅ Game started with {result['total_rounds']} rounds")
        
    except ValueError as ve:
        print(f"❌ Error starting game (ValueError): {ve}")
        await sio.emit('error', {"message": str(ve)}, room=sid)
    except Exception as e:
        print(f"❌ Error starting game: {e}")
        await sio.emit('error', {"message": "Failed to start game. Please try again."}, room=sid)

@sio.event
async def submitGuess(sid, data):
    try:
        print(f"🎯 SUBMIT GUESS REQUEST: {sid}")
        game_id = data.get('gameId')
        player_id = data.get('playerId')
        guess = data.get('guess')
        
        if not game_id or not player_id or not guess:
            await sio.emit('error', {"message": "Game ID, Player ID, and Guess are required."}, room=sid)
            return
            
        # Process guess using GameManager
        result = game_manager.submit_guess(game_id, player_id, guess)
        
        # Notify the player about their guess result
        await sio.emit('guessResult', {
            "correct": result['correct'],
            "points": result['points'],
            "newScore": result['new_score']
        }, room=sid)
        
        # Update leaderboard for all players
        leaderboard = game_manager.get_leaderboard(game_id)
        await sio.emit('leaderboardUpdate', {
            "leaderboard": leaderboard
        }, room=game_id)
        
        print(f"✅ Guess processed: {result['correct']}, Points: {result['points']}")
        
    except ValueError as ve:
        print(f"❌ Error submitting guess (ValueError): {ve}")
        await sio.emit('error', {"message": str(ve)}, room=sid)
    except Exception as e:
        print(f"❌ Error submitting guess: {e}")
        await sio.emit('error', {"message": "Failed to submit guess. Please try again."}, room=sid)

@sio.event
async def nextRound(sid, data):
    try:
        print(f"🔄 NEXT ROUND REQUEST: {sid}")
        game_id = data.get('gameId')
        
        if not game_id:
            await sio.emit('error', {"message": "Game ID is required."}, room=sid)
            return
            
        # Get current game state
        game = game_manager.get_game(game_id)
        if not game:
            await sio.emit('error', {"message": "Game not found."}, room=sid)
            return
        
        # Start next round
        round_data = game_manager.start_next_round(game_id)
        
        # Check if game is finished
        if round_data.get('game_finished', False):
            # End the game
            result = await game_manager.end_game(game_id)
            await sio.emit('gameEnd', {
                "finalLeaderboard": result['leaderboard']
            }, room=game_id)
            return
        
        # Notify all players about the new round
        await sio.emit('newRound', {
            "track": round_data['track'],
            "roundInfo": {
                "current": round_data['current_round'],
                "total": round_data['total_rounds']
            },
            "timeLimit": round_data['time_limit']
        }, room=game_id)
        
        # Start the countdown timer for this round
        await start_countdown_timer(game_id, round_data['time_limit'])
        
        print(f"✅ Advanced to round {round_data['current_round']}")
        
    except Exception as e:
        print(f"❌ Error advancing round: {e}")
        await sio.emit('error', {"message": "Failed to advance round. Please try again."}, room=sid)

@sio.event
async def leaveGame(sid, data):
    try:
        print(f"leaveGame: {sid}")
        game_id = data.get('gameId')
        player_id = data.get('playerId')
        
        if not game_id or not player_id:
            await sio.emit('error', {"message": "Game ID and Player ID are required."}, room=sid)
            return
            
        result = await game_manager.remove_player(sid)
        
        if result and result.get('game_ended'):
            # Game ended, notify all players
            await sio.emit('gameEnded', {"message": "Game ended by host."}, room=game_id)
        elif result:
            # Player left, update player list
            await sio.emit('playerListUpdate', {
                "players": serialize_player_data(result['players'])
            }, room=game_id)
        
    except Exception as e:
        print(f"Error leaving game: {e}")
        await sio.emit('error', {"message": "Failed to leave game. Please try again."}, room=sid)

# Mount Socket.IO app
app.mount('/socket.io', socket_app)

# Simplified Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    print(f"Unhandled exception: {exc}") # Log the full error for debugging
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected error occurred. Please try again later."}
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5001)) # Changed default port to 5001 to avoid conflict if Node server is also running
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)