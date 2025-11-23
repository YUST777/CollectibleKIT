#!/usr/bin/env python3
"""
Multi-account configuration for Portal Market API
Supports multiple Telegram accounts for parallel price fetching
"""

# Account configurations
PORTAL_ACCOUNTS = [
    {
        "account_id": 1,
        "api_id": 37473122,
        "api_hash": "2346432f6eb44dc26547319a51eb60d3",
        "app_title": "Canvasstory",
        "session_name": "portals_session_1",
        "auth_cache_file": "portal_auth_cache_1.json"
    },
    {
        "account_id": 2,
        "api_id": 28355662,
        "api_hash": "0dbe8b8394a1a4fbc5c62a6d82dfdb36",
        "app_title": "Canvasstory2",
        "session_name": "portals_session_2",
        "auth_cache_file": "portal_auth_cache_2.json"
    },
    {
        "account_id": 3,
        "api_id": 22307634,
        "api_hash": "7ab906fc6d065a2047a84411c1697593",
        "app_title": "Main Account",
        "session_name": "portals_session",
        "auth_cache_file": "portal_auth_cache_3.json"
    },
    {
        "account_id": 4,
        "api_id": 22307634,
        "api_hash": "7ab906fc6d065a2047a84411c1697593",
        "app_title": "businessduck1",
        "session_name": "portals_session_4",
        "auth_cache_file": "portal_auth_cache_4.json"
    }
]

# Default session path (gifts directory)
DEFAULT_SESSION_PATH = None  # Will be set dynamically

# Auth cache TTL (1 hour)
AUTH_CACHE_TTL = 3600

