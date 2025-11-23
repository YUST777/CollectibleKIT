#!/usr/bin/env python3
"""
Global price cache - shared across all users
Saves API calls when multiple users have same gifts
"""
import sqlite3
import json
import os
import time
from typing import Optional, Tuple

# Database path
DB_PATH = '/root/01studio/CollectibleKIT/bot/bot_data.db'

# Cache TTL: 10 minutes
CACHE_TTL = 600  # 10 minutes in seconds

def normalize_attr(attr):
    """Normalize attribute name for consistent caching"""
    if attr is None:
        return ""
    return str(attr).strip().lower()

def get_cache_key(gift_name: str, model: Optional[str], backdrop: Optional[str]) -> str:
    """Create normalized cache key"""
    normalized_gift = gift_name.lower().strip()
    normalized_model = normalize_attr(model)
    normalized_backdrop = normalize_attr(backdrop)
    return f"{normalized_gift}|{normalized_model}|{normalized_backdrop}"

def get_cached_price(gift_name: str, model: Optional[str], backdrop: Optional[str]) -> Optional[float]:
    """Get price from global cache if valid"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Ensure table exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS global_price_cache (
                cache_key TEXT PRIMARY KEY,
                price REAL NOT NULL,
                cached_at INTEGER NOT NULL
            )
        """)
        
        cache_key = get_cache_key(gift_name, model, backdrop)
        cursor.execute("""
            SELECT price, cached_at FROM global_price_cache WHERE cache_key = ?
        """, (cache_key,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            price, cached_at = row
            age = time.time() - cached_at
            if age < CACHE_TTL:
                return float(price)
            # Cache expired
            return None
        return None
    except Exception:
        return None

def set_cached_price(gift_name: str, model: Optional[str], backdrop: Optional[str], price: float):
    """Save price to global cache"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cache_key = get_cache_key(gift_name, model, backdrop)
        cached_at = int(time.time())
        
        cursor.execute("""
            INSERT OR REPLACE INTO global_price_cache (cache_key, price, cached_at)
            VALUES (?, ?, ?)
        """, (cache_key, price, cached_at))
        
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def cleanup_expired_cache():
    """Remove expired cache entries"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        expired_before = int(time.time()) - CACHE_TTL
        cursor.execute("""
            DELETE FROM global_price_cache WHERE cached_at < ?
        """, (expired_before,))
        
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

