#!/usr/bin/env python3
"""
Create portfolio snapshot for a user
Saves daily portfolio value to database for profit/loss tracking
"""
import asyncio
import sys
import json
import os
import sqlite3
from datetime import datetime
from get_profile_gifts import get_profile_gifts

# Database path
DB_PATH = '/root/01studio/CollectibleKIT/bot/bot_data.db'

def save_snapshot(user_id: int, portfolio_data: dict):
    """Save portfolio snapshot to database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Ensure table exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS portfolio_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                snapshot_date TEXT NOT NULL,
                snapshot_timestamp INTEGER NOT NULL,
                total_value REAL NOT NULL,
                gift_count INTEGER NOT NULL,
                upgraded_count INTEGER NOT NULL,
                unupgraded_count INTEGER NOT NULL,
                upgraded_value REAL DEFAULT 0,
                unupgraded_value REAL DEFAULT 0,
                created_at INTEGER NOT NULL,
                UNIQUE(user_id, snapshot_date)
            )
        """)
        
        # Get portfolio data
        gifts = portfolio_data.get('gifts', [])
        total_value = portfolio_data.get('total_value', 0)
        total_count = portfolio_data.get('total', len(gifts))
        nft_count = portfolio_data.get('nft_count', 0)
        
        # Calculate upgraded/unupgraded values
        upgraded_gifts = [g for g in gifts if g.get('is_upgraded')]
        unupgraded_gifts = [g for g in gifts if not g.get('is_upgraded')]
        
        upgraded_value = sum(g.get('price', 0) or 0 for g in upgraded_gifts if g.get('price'))
        unupgraded_value = sum(g.get('price', 0) or 0 for g in unupgraded_gifts if g.get('price'))
        
        unupgraded_count = total_count - nft_count
        
        # Get current date and timestamp
        today = datetime.now().strftime('%Y-%m-%d')
        timestamp = int(datetime.now().timestamp() * 1000)
        
        # Insert or replace snapshot
        cursor.execute("""
            INSERT OR REPLACE INTO portfolio_snapshots 
            (user_id, snapshot_date, snapshot_timestamp, total_value, gift_count,
             upgraded_count, unupgraded_count, upgraded_value, unupgraded_value, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, today, timestamp, total_value, total_count, 
              nft_count, unupgraded_count, upgraded_value, unupgraded_value, timestamp))
        
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        print(f"Error saving snapshot: {e}", file=sys.stderr)
        return False

async def create_snapshot_for_user(user_id):
    """Create snapshot for a single user"""
    try:
        # Fetch portfolio using subprocess (get_profile_gifts prints JSON)
        import subprocess
        script_path = os.path.join(os.path.dirname(__file__), 'get_profile_gifts.py')
        result = subprocess.run(
            ['python3', script_path, str(user_id)],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=os.path.dirname(os.path.dirname(script_path))
        )
        
        if result.returncode != 0:
            print(f"Error fetching portfolio for user {user_id}: {result.stderr}", file=sys.stderr)
            return False
        
        # Parse JSON from output
        output = result.stdout
        json_start = output.find('{')
        json_end = output.rfind('}') + 1
        
        if json_start >= 0 and json_end > json_start:
            json_str = output[json_start:json_end]
            portfolio_data = json.loads(json_str)
            
            if portfolio_data.get('success'):
                # Save snapshot
                success = save_snapshot(user_id, portfolio_data)
                if success:
                    print(f"✅ Snapshot created for user {user_id}: {portfolio_data.get('total_value', 0)} TON")
                    return True
                else:
                    print(f"❌ Failed to save snapshot for user {user_id}", file=sys.stderr)
                    return False
            else:
                print(f"❌ Portfolio fetch failed for user {user_id}: {portfolio_data.get('error')}", file=sys.stderr)
                return False
        else:
            print(f"❌ Could not parse portfolio data for user {user_id}", file=sys.stderr)
            return False
            
    except Exception as e:
        print(f"Error creating snapshot for user {user_id}: {e}", file=sys.stderr)
        return False

async def create_snapshots_for_all_users():
    """Create snapshots for all users in database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get all user IDs
        cursor.execute("SELECT user_id FROM users")
        users = cursor.fetchall()
        conn.close()
        
        user_ids = [row[0] for row in users]
        
        print(f"📊 Creating snapshots for {len(user_ids)} users...")
        
        # Process in batches of 10 to avoid overwhelming the system
        batch_size = 10
        success_count = 0
        fail_count = 0
        
        for i in range(0, len(user_ids), batch_size):
            batch = user_ids[i:i+batch_size]
            
            # Process batch in parallel
            tasks = [create_snapshot_for_user(user_id) for user_id in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    fail_count += 1
                elif result:
                    success_count += 1
                else:
                    fail_count += 1
            
            print(f"Progress: {min(i+batch_size, len(user_ids))}/{len(user_ids)} users processed")
            
            # Small delay between batches
            if i + batch_size < len(user_ids):
                await asyncio.sleep(2)
        
        print(f"\n✅ Snapshots complete: {success_count} success, {fail_count} failed")
        return success_count, fail_count
        
    except Exception as e:
        print(f"Error creating snapshots: {e}", file=sys.stderr)
        return 0, 0

async def main():
    """Main function"""
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--all-users':
            # Create snapshots for all users
            await create_snapshots_for_all_users()
        else:
            # Create snapshot for specific user
            try:
                user_id = int(sys.argv[1])
                await create_snapshot_for_user(user_id)
            except ValueError:
                print(f"Invalid user ID: {sys.argv[1]}", file=sys.stderr)
                sys.exit(1)
    else:
        print("Usage: create_portfolio_snapshot.py [user_id|--all-users]")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

