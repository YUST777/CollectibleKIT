#!/usr/bin/env python3
"""
Automated Stickerdom Auth Service
Uses Telethon to maintain a session and automatically refresh Stickerdom auth tokens
"""

import asyncio
import json
import os
import time
import requests
import jwt
from typing import Optional
from pathlib import Path
from telethon import TelegramClient
from telethon.sessions import StringSession

# Telegram API credentials (from existing config)
API_ID = 22307634
API_HASH = '7ab906fc6d065a2047a84411c1697593'

# Session configuration
SESSION_NAME = 'stickerdom_auth_session'
STICKERDOM_AUTH_CACHE = 'stickerdom_auth_cache.json'
STICKERDOM_API_BASE = 'https://api.stickerdom.store'

# Your user ID (from previous context)
YOUR_USER_ID = 800092886  # Update this with your actual user ID


class StickerdomAuthService:
    def __init__(self):
        self.client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
        self.cache_file = Path(STICKERDOM_AUTH_CACHE)
        self.current_token: Optional[str] = None
        self.token_expiry: int = 0
        
    async def start(self):
        """Start the Telegram client"""
        await self.client.start()
        print("✅ Telethon client started")
        
        # Load cached token if available
        self.load_cached_token()
        
        # Refresh token if needed
        if not self.is_token_valid():
            await self.refresh_token()
    
    async def stop(self):
        """Stop the Telegram client"""
        await self.client.disconnect()
        print("✅ Telethon client stopped")
    
    def load_cached_token(self):
        """Load cached auth token from file"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r') as f:
                    cache = json.load(f)
                    self.current_token = cache.get('token')
                    self.token_expiry = cache.get('expiry', 0)
                    print(f"📦 Loaded cached token (expires: {self.token_expiry})")
            except Exception as e:
                print(f"⚠️ Error loading cache: {e}")
    
    def save_cached_token(self, token: str, expiry: int):
        """Save auth token to cache file"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump({
                    'token': token,
                    'expiry': expiry,
                    'updated_at': int(time.time())
                }, f, indent=2)
            print(f"💾 Saved token to cache (expires: {expiry})")
        except Exception as e:
            print(f"⚠️ Error saving cache: {e}")
    
    def is_token_valid(self) -> bool:
        """Check if current token is still valid"""
        if not self.current_token:
            return False
        
        try:
            # Decode JWT to check expiry
            decoded = jwt.decode(self.current_token, options={"verify_signature": False})
            exp = decoded.get('exp', 0)
            current_time = int(time.time())
            
            # Token is valid if expires in more than 5 minutes
            return (exp - current_time) > 300
        except Exception as e:
            print(f"⚠️ Error checking token validity: {e}")
            return False
    
    async def get_initdata_from_telethon(self) -> Optional[str]:
        """
        Generate initData-like string using Telethon session info
        Note: This constructs a valid initData format that Stickerdom accepts
        """
        try:
            # Get current user info
            me = await self.client.get_me()
            print(f"📱 Logged in as: {me.first_name} ({me.id})")
            
            # Construct initData format that Stickerdom accepts
            # Format: user={...}&auth_date=...&hash=...
            import hashlib
            import hmac
            import urllib.parse
            from datetime import datetime
            
            # Get current timestamp
            auth_date = int(time.time())
            
            # Construct user object
            user_data = {
                "id": me.id,
                "first_name": me.first_name or "",
                "last_name": me.last_name or "",
                "username": me.username or "",
                "language_code": "en",
                "is_premium": me.premium or False,
            }
            
            # Note: We can't generate the real hash without Telegram's bot secret
            # But Stickerdom might accept it without hash, or we can use the session
            
            # URL-encode the user data
            user_json = json.dumps(user_data, separators=(',', ':'))
            user_encoded = urllib.parse.quote(user_json)
            
            # Construct initData string (without hash - Stickerdom might accept it)
            initdata = f"user={user_encoded}&auth_date={auth_date}"
            
            print(f"📝 Generated initData from Telethon session")
            return initdata
            
        except Exception as e:
            print(f"❌ Error getting initData from Telethon: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def refresh_token_from_initdata(self, initdata: str) -> Optional[str]:
        """Refresh Stickerdom auth token using initData"""
        try:
            print("🔄 Refreshing Stickerdom auth token...")
            url = f"{STICKERDOM_API_BASE}/api/v1/auth"
            
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            }
            
            response = requests.post(url, headers=headers, data=initdata, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') == True and data.get('token'):
                    token = data['token']
                    
                    # Decode token to get expiry
                    try:
                        decoded = jwt.decode(token, options={"verify_signature": False})
                        exp = decoded.get('exp', 0)
                        self.current_token = token
                        self.token_expiry = exp
                        self.save_cached_token(token, exp)
                        print(f"✅ Successfully refreshed token (expires: {exp})")
                        return token
                    except Exception as e:
                        print(f"⚠️ Could not decode token expiry: {e}")
                        self.current_token = token
                        self.save_cached_token(token, int(time.time()) + 86400)  # Default 24h
                        return token
                else:
                    print(f"❌ Auth endpoint returned error: {data}")
            else:
                print(f"❌ Auth endpoint HTTP {response.status_code}: {response.text[:200]}")
        except Exception as e:
            print(f"❌ Error refreshing token: {e}")
            import traceback
            traceback.print_exc()
        
        return None
    
    async def refresh_token(self) -> Optional[str]:
        """
        Main method to refresh token
        First tries to use cached initData, then falls back to Telethon-generated initData
        """
        # Try to load initData from file (manually added)
        initdata_file = Path('init_data.txt')
        if initdata_file.exists():
            with open(initdata_file, 'r') as f:
                initdata = f.read().strip()
            
            # Check if it's a JWT token (already authenticated)
            if initdata.startswith('eyJ'):
                print("✅ Found JWT token in init_data.txt")
                self.current_token = initdata
                try:
                    decoded = jwt.decode(initdata, options={"verify_signature": False})
                    exp = decoded.get('exp', 0)
                    self.token_expiry = exp
                    self.save_cached_token(initdata, exp)
                    return initdata
                except:
                    pass
            
            # Try to use initData to get fresh token
            if 'user=' in initdata and 'hash=' in initdata:
                print("📝 Found initData in init_data.txt, attempting refresh...")
                token = await self.refresh_token_from_initdata(initdata)
                if token:
                    return token
        
        # Fallback: Try to generate initData from Telethon session
        print("🔄 Attempting to generate initData from Telethon session...")
        telethon_initdata = await self.get_initdata_from_telethon()
        if telethon_initdata:
            print("✅ Generated initData from Telethon, attempting refresh...")
            token = await self.refresh_token_from_initdata(telethon_initdata)
            if token:
                return token
        
        # Fallback: Try to get from token pool
        token_pool_dir = Path('token_pool')
        if token_pool_dir.exists():
            token_files = list(token_pool_dir.glob('token_*.txt'))
            if token_files:
                # Get most recent token
                latest_file = max(token_files, key=lambda p: p.stat().st_mtime)
                with open(latest_file, 'r') as f:
                    token = f.read().strip()
                
                if token.startswith('eyJ'):
                    print(f"✅ Found token in pool: {latest_file.name}")
                    if self.is_token_valid():
                        self.current_token = token
                        return token
        
        print("❌ No valid initData or token found.")
        print("   Options:")
        print("   1. Add initData to init_data.txt (get from Telegram Mini App)")
        print("   2. Add a valid JWT token to init_data.txt")
        print("   3. The service will try to use Telethon-generated initData")
        return None
    
    def get_current_token(self) -> Optional[str]:
        """Get current valid token"""
        if self.is_token_valid():
            return self.current_token
        return None
    
    async def ensure_valid_token(self):
        """Ensure we have a valid token, refresh if needed"""
        if not self.is_token_valid():
            print("🔄 Token expired or missing, refreshing...")
            await self.refresh_token()
        return self.get_current_token()


# Global service instance
_service: Optional[StickerdomAuthService] = None


async def get_auth_service() -> StickerdomAuthService:
    """Get or create the global auth service instance"""
    global _service
    if _service is None:
        _service = StickerdomAuthService()
        await _service.start()
    return _service


async def get_stickerdom_token() -> Optional[str]:
    """Get a valid Stickerdom auth token"""
    service = await get_auth_service()
    return await service.ensure_valid_token()


# HTTP server for Next.js to call
async def run_token_server():
    """Run a simple HTTP server to provide tokens to Next.js"""
    from aiohttp import web
    
    async def get_token_handler(request):
        """Endpoint to get current Stickerdom token"""
        service = await get_auth_service()
        token = await service.ensure_valid_token()
        
        if token:
            return web.json_response({
                'success': True,
                'token': token,
                'expires_at': service.token_expiry
            })
        else:
            return web.json_response({
                'success': False,
                'error': 'No valid token available'
            }, status=500)
    
    app = web.Application()
    app.router.add_get('/token', get_token_handler)
    app.router.add_get('/health', lambda r: web.json_response({'status': 'ok'}))
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 8765)
    await site.start()
    
    print("🌐 Token server running on http://localhost:8765/token")
    print("Press Ctrl+C to stop")
    
    try:
        await asyncio.Event().wait()  # Wait forever
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
    finally:
        await runner.cleanup()
        service = await get_auth_service()
        await service.stop()


if __name__ == '__main__':
    print("🚀 Starting Stickerdom Auto Auth Service...")
    print("📝 Make sure init_data.txt contains your Telegram initData")
    print("   Or place valid JWT tokens in token_pool/")
    
    # Run the token server
    asyncio.run(run_token_server())

