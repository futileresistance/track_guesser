#!/usr/bin/env python3
"""
Simple test script to check Deezer API configuration
"""

import os
from dotenv import load_dotenv
from services.deezer_service import DeezerService

def test_deezer_config():
    print("🔍 Testing Deezer API Configuration...")
    
    # Load environment variables
    load_dotenv()
    
    # Test Deezer service
    try:
        deezer_service = DeezerService()
        
        if not deezer_service.is_configured():
            print("❌ Deezer service not properly configured")
            return False
        
        print("✅ Deezer service configured successfully")
        
        # Test search
        print("\n🔍 Testing search functionality...")
        results = deezer_service.search_tracks("test", 1)
        print(f"✅ Search successful: {len(results['tracks'])} tracks found")
        
        if results['tracks']:
            track = results['tracks'][0]
            print(f"🎵 Sample track: {track['name']} by {track['artists'][0]['name']}")
            print(f"🔗 Preview URL: {'✅ Available' if track['preview_url'] else '❌ Not available'}")
        
        # Test popular tracks
        print("\n🔥 Testing popular tracks...")
        popular_tracks = deezer_service.get_popular_tracks(5)
        print(f"✅ Popular tracks: {len(popular_tracks)} tracks found")
        
        if popular_tracks:
            track = popular_tracks[0]
            print(f"🎵 Popular track: {track['name']} by {track['artists'][0]['name']}")
        
        # Test get track
        if results['tracks']:
            print("\n📀 Testing get track...")
            track_id = results['tracks'][0]['id']
            track = deezer_service.get_track(track_id)
            print(f"✅ Get track successful: {track['name']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing Deezer service: {e}")
        return False

if __name__ == "__main__":
    success = test_deezer_config()
    if success:
        print("\n🎉 All tests passed! Deezer API is working correctly.")
    else:
        print("\n💥 Tests failed! Please check your configuration.") 