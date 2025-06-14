import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')

if not supabase_url or not supabase_key:
    print('⚠️ Supabase credentials not found. Database features will be limited.')

supabase: Client = create_client(
    supabase_url or 'https://placeholder.supabase.co',
    supabase_key or 'placeholder-key'
)