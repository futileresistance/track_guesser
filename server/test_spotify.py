#!/usr/bin/env python3
"""
Simple test script to check Spotify API configuration
"""

import os
from dotenv import load_dotenv
from services.spotify_service import SpotifyService

def test_spotify_config():
    print("🔍 Testing Spotify API Configuration...")
    
    # Load environment variables
    load_dotenv()
    
    # Check environment variables
    client_id = os.getenv('SPOTIFY_CLIENT_ID')
    client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
    
    print(f"📋 SPOTIFY_CLIENT_ID: {'✅ Set' if client_id else '❌ Not set'}")
    print(f"📋 SPOTIFY_CLIENT_SECRET: {'✅ Set' if client_secret else '❌ Not set'}")
    
    if not client_id or not client_secret:
        print("\n❌ Spotify credentials not configured!")
        print("Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables")
        return False
    
    # Test Spotify service
    try:
        spotify_service = SpotifyService()
        
        if not spotify_service.is_configured():
            print("❌ Spotify service not properly configured")
            return False
        
        print("✅ Spotify service configured successfully")
        
        # Test search
        print("\n🔍 Testing search functionality...")
        results = spotify_service.search_tracks("test", 1)
        print(f"✅ Search successful: {len(results['tracks'])} tracks found")
        
        if results['tracks']:
            track = results['tracks'][0]
            print(f"🎵 Sample track: {track['name']} by {track['artists'][0]['name']}")
            print(f"🔗 Preview URL: {'✅ Available' if track['preview_url'] else '❌ Not available'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing Spotify service: {e}")
        return False

if __name__ == "__main__":
    success = test_spotify_config()
    if success:
        print("\n🎉 All tests passed! Spotify API is working correctly.")
    else:
        print("\n💥 Tests failed! Please check your configuration.") 