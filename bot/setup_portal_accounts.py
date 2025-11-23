#!/usr/bin/env python3
"""
Interactive script to set up multiple Portal Market accounts
This will prompt for phone numbers and codes for each account
"""
import asyncio
import sys
import os
from pyrogram import Client
# CRITICAL: Patch timeout BEFORE importing aportalsmp functions
# This increases timeout from 15s to 60s
try:
    import aportalsmp.handlers as handlers
    _original_fetch = handlers.fetch
    async def patched_fetch(method="GET", url="", headers=None, json=None, timeout=60, impersonate="chrome110"):
        return await _original_fetch(method, url, headers, json, timeout, impersonate)
    handlers.fetch = patched_fetch
except:
    pass  # If patching fails, continue anyway

from aportalsmp import update_auth
from portal_accounts_config import PORTAL_ACCOUNTS, DEFAULT_SESSION_PATH

# Set session path to gifts directory
gifts_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gifts')
if not os.path.exists(gifts_dir):
    os.makedirs(gifts_dir, exist_ok=True)

async def setup_account(account_config):
    """Set up a single Portal Market account"""
    account_id = account_config["account_id"]
    api_id = account_config["api_id"]
    api_hash = account_config["api_hash"]
    app_title = account_config["app_title"]
    session_name = account_config["session_name"]
    
    print(f"\n{'='*60}")
    print(f"🔐 Setting up Account {account_id}: {app_title}")
    print(f"{'='*60}")
    
    # Create client with account-specific session
    session_path = os.path.join(gifts_dir, f"{session_name}.session")
    client = Client(session_name, api_id, api_hash, workdir=gifts_dir)
    
    try:
        # Start client (will prompt for phone number if not authorized)
        print(f"📱 Starting Telegram client for {app_title}...")
        await client.start()
        
        # Test authentication by getting current user
        me = await client.get_me()
        print(f"✅ Logged in as: {me.first_name} (@{me.username})")
        print(f"   User ID: {me.id}")
        
        # Stop client before update_auth creates its own
        await client.stop()
        
        # Now generate authData for Portal Market
        print(f"\n🔑 Generating Portal Market authData for Account {account_id}...")
        authData = await update_auth(
            api_id=api_id,
            api_hash=api_hash,
            session_name=session_name,
            session_path=gifts_dir
        )
        
        if authData:
            print(f"✅ Portal Market authData generated successfully!")
            print(f"   AuthData length: {len(authData)} characters")
            
            # Test search to verify it works
            print(f"\n🧪 Testing Portal Market connection...")
            from aportalsmp import search as search_gifts
            try:
                results = await search_gifts(
                    sort="price_asc",
                    limit=1,
                    gift_name="IceCream",
                    authData=authData
                )
                if results:
                    print(f"✅ Portal Market working! Found {len(results)} result(s)")
                    print(f"   Test price: {results[0].price} TON")
                else:
                    print("⚠️ No results found (but API is connected)")
            except Exception as e:
                print(f"⚠️ Test search failed: {e}")
                print("   (This might be normal if Portal Market is slow)")
            
            return True
        else:
            print(f"❌ Failed to generate authData")
            return False
        
    except KeyboardInterrupt:
        print(f"\n⚠️ Setup cancelled by user for Account {account_id}")
        return False
    except Exception as e:
        print(f"❌ Error setting up Account {account_id}: {e}")
        import traceback
        traceback.print_exc()
        try:
            await client.stop()
        except:
            pass
        return False

async def main():
    """Set up all Portal Market accounts"""
    print("="*60)
    print("🚀 Portal Market Multi-Account Setup")
    print("="*60)
    print(f"\nThis will set up {len(PORTAL_ACCOUNTS)} Portal Market accounts.")
    print("You'll need to provide phone numbers and verification codes for each account.")
    print("\n⚠️  Make sure you have access to the phone numbers for each account!")
    
    try:
        input("\nPress Enter to continue...")
    except EOFError:
        # Non-interactive mode - continue anyway
        print("\n⏳ Starting setup (non-interactive mode)...")
    
    results = []
    for account in PORTAL_ACCOUNTS:
        success = await setup_account(account)
        results.append((account["account_id"], success))
        
        if account != PORTAL_ACCOUNTS[-1]:  # Not the last account
            print(f"\n⏳ Waiting 3 seconds before next account...")
            await asyncio.sleep(3)
    
    # Summary
    print("\n" + "="*60)
    print("📊 Setup Summary")
    print("="*60)
    for account_id, success in results:
        status = "✅ Success" if success else "❌ Failed"
        print(f"Account {account_id}: {status}")
    
    successful = sum(1 for _, success in results if success)
    print(f"\n✅ {successful}/{len(PORTAL_ACCOUNTS)} accounts set up successfully!")
    
    if successful > 0:
        print("\n🎉 Setup complete! Your accounts are ready to use.")
        print("   You can now use multi-account price fetching in get_profile_gifts.py")
    else:
        print("\n⚠️  No accounts were set up successfully. Please try again.")

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️ Setup cancelled by user")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()

