#!/usr/bin/env python3
"""
Helper functions for portfolio cache management
Works with SQLite database to store/retrieve cached portfolio data
"""
import sqlite3
import json
import os
import sys
import time
from typing import Optional, Dict, Any

# Database path (same as Next.js uses)
DB_PATH = '/root/01studio/CollectibleKIT/bot/bot_data.db'

def get_cached_portfolio(user_id: int) -> Optional[Dict[str, Any]]:
    """Get cached portfolio for user"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT gifts_data, total_value, cached_at, is_fetching, fetch_started_at
            FROM portfolio_auto_gifts_cache
            WHERE user_id = ?
        """, (user_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'gifts': json.loads(row[0]),
                'total_value': row[1],
                'cached_at': row[2],
                'is_fetching': bool(row[3]),
                'fetch_started_at': row[4]
            }
        return None
    except Exception as e:
        print(f"Error getting cached portfolio: {e}", file=sys.stderr)
        return None

def set_cached_portfolio(user_id: int, gifts: list, total_value: float, is_fetching: bool = False):
    """Save portfolio to cache"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS portfolio_auto_gifts_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                gifts_data TEXT NOT NULL,
                total_value REAL NOT NULL,
                cached_at REAL NOT NULL,
                is_fetching INTEGER DEFAULT 0,
                fetch_started_at INTEGER DEFAULT NULL
            )
        """)
        
        # Insert or update
        fetch_started_at = int(time.time() * 1000) if is_fetching else None
        cursor.execute("""
            INSERT OR REPLACE INTO portfolio_auto_gifts_cache 
            (user_id, gifts_data, total_value, cached_at, is_fetching, fetch_started_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, json.dumps(gifts), total_value, int(time.time() * 1000), 
              1 if is_fetching else 0, fetch_started_at))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error setting cached portfolio: {e}", file=sys.stderr)
        return False

def set_fetching_status(user_id: int, is_fetching: bool):
    """Set fetching status"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        fetch_started_at = int(time.time() * 1000) if is_fetching else None
        cursor.execute("""
            UPDATE portfolio_auto_gifts_cache
            SET is_fetching = ?, fetch_started_at = ?
            WHERE user_id = ?
        """, (1 if is_fetching else 0, fetch_started_at, user_id))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error setting fetching status: {e}", file=sys.stderr)
        return False

def is_fetching(user_id: int) -> bool:
    """Check if portfolio is currently being fetched"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT is_fetching FROM portfolio_auto_gifts_cache WHERE user_id = ?
        """, (user_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        return bool(row[0]) if row else False
    except Exception:
        return False

