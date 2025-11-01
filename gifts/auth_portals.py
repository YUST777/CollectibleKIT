#!/usr/bin/env python3
"""
Interactive script to authenticate with Portal Market using Pyrogram
This will prompt for phone number and code to create an authorized session
"""

import asyncio
from pyrogram import Client
from aportalsmp import update_auth

async def auth_session():
    """Authenticate Pyrogram session for Portal Market."""
    print("🔐 Portal Market Authentication")
    print("=" * 50)
    
    API_ID = 22307634
    API_HASH = '7ab906fc6d065a2047a84411c1697593'
    SESSION_NAME = "portals_session"
    
    # Create client
    client = Client(SESSION_NAME, API_ID, API_HASH, workdir="/home/yousefmsm1/Desktop/gifts")
    
    try:
        # Start client (will prompt for phone number if not authorized)
        await client.start()
        print("✅ Pyrogram session authorized successfully!")
        
        # Test authentication by getting current user
        me = await client.get_me()
        print(f"📱 Logged in as: {me.first_name} (@{me.username})")
        
        # Stop client before update_auth creates its own
        await client.stop()
        
        # Now generate authData for Portal Market
        print("\n🔑 Generating Portal Market authData...")
        authData = await update_auth(
            api_id=API_ID, 
            api_hash=API_HASH, 
            session_name=SESSION_NAME, 
            session_path="/home/yousefmsm1/Desktop/gifts"
        )
        
        print("✅ Portal Market authData generated successfully!")
        print(f"\n📋 AuthData saved in session: {authData[:50]}...")
        
        # Test search to verify it works
        print("\n🧪 Testing Portal Market connection...")
        from aportalsmp import search as search_gifts
        results = await search_gifts(
            sort="price_asc",
            limit=1,
            gift_name="IceCream",
            authData=authData
        )
        
        if results:
            print(f"✅ Portal Market working! Found {len(results)} result(s)")
        else:
            print("⚠️ No results found (but API is connected)")
        
        print("\n🎉 Setup complete! Your bot is now ready to show Portal Market prices!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        try:
            await client.stop()
        except:
            pass

if __name__ == '__main__':
    try:
        asyncio.run(auth_session())
    except KeyboardInterrupt:
        print("\n\n⚠️ Authentication cancelled by user")
    except Exception as e:
        print(f"❌ Fatal error: {e}")

