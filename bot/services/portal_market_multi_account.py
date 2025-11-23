#!/usr/bin/env python3
"""
Multi-account Portal Market API wrapper
Uses 3 accounts in parallel/rotation for faster price fetching
"""
import asyncio
import sys
from typing import Optional, List, Dict, Any
from collections import deque
import time

# Import the base wrapper
from portal_market_api import PortalMarketAPI, _apply_portal_market_fixes

# Apply fixes first
_apply_portal_market_fixes()

# Import account config
try:
    from portal_accounts_config import PORTAL_ACCOUNTS
    MULTI_ACCOUNT_AVAILABLE = True
except ImportError:
    MULTI_ACCOUNT_AVAILABLE = False
    PORTAL_ACCOUNTS = []


class MultiAccountPortalMarketAPI:
    """Portal Market API using multiple accounts for parallel fetching"""
    
    def __init__(self, session_path: str = None):
        """
        Initialize multi-account API
        
        Args:
            session_path: Path to session files directory
        """
        self.session_path = session_path
        self.accounts: List[PortalMarketAPI] = []
        self.account_queue = deque()
        self.account_lock = asyncio.Lock()
        self._initialized = False
    
    async def _initialize_accounts(self):
        """Initialize all available accounts"""
        if self._initialized:
            return
        
        if not MULTI_ACCOUNT_AVAILABLE or not PORTAL_ACCOUNTS:
            raise Exception("Multi-account config not available")
        
        print(f"🔑 Initializing {len(PORTAL_ACCOUNTS)} Portal Market accounts...", file=sys.stderr)
        
        # Initialize all accounts
        for account_config in PORTAL_ACCOUNTS:
            try:
                api = PortalMarketAPI(
                    api_id=account_config["api_id"],
                    api_hash=account_config["api_hash"],
                    session_name=account_config["session_name"],
                    session_path=self.session_path
                )
                # Try to authenticate (with timeout to avoid hanging on interactive prompts)
                try:
                    auth = await asyncio.wait_for(api.authenticate(), timeout=5.0)
                    if auth:
                        self.accounts.append(api)
                        self.account_queue.append(api)
                        print(f"   ✅ Account {account_config['account_id']} ({account_config['app_title']}) authenticated", file=sys.stderr)
                    else:
                        print(f"   ⚠️ Account {account_config['account_id']} auth returned empty", file=sys.stderr)
                except asyncio.TimeoutError:
                    print(f"   ⚠️ Account {account_config['account_id']} auth timeout (needs interactive login)", file=sys.stderr)
                except (EOFError, KeyboardInterrupt):
                    print(f"   ⚠️ Account {account_config['account_id']} needs interactive login", file=sys.stderr)
                except Exception as e:
                    error_msg = str(e)
                    if "EOF" in error_msg or "interactive" in error_msg.lower():
                        print(f"   ⚠️ Account {account_config['account_id']} needs interactive login", file=sys.stderr)
                    else:
                        print(f"   ⚠️ Account {account_config['account_id']} auth failed: {error_msg[:50]}", file=sys.stderr)
            except Exception as e:
                print(f"   ❌ Account {account_config['account_id']} init failed: {e}", file=sys.stderr)
        
        if not self.accounts:
            raise Exception("No accounts could be authenticated")
        
        self._initialized = True
        print(f"✅ {len(self.accounts)} accounts ready for use", file=sys.stderr)
    
    async def _get_next_account(self) -> PortalMarketAPI:
        """Get next account in round-robin fashion"""
        await self._initialize_accounts()
        
        async with self.account_lock:
            if not self.account_queue:
                # Rebuild queue if empty
                self.account_queue.extend(self.accounts)
            
            account = self.account_queue.popleft()
            self.account_queue.append(account)  # Put back at end for round-robin
            return account
    
    async def get_all_floor_prices(self) -> Dict[str, float]:
        """
        Get floor prices for all gift collections using first available account
        
        Returns:
            Dictionary mapping gift names to floor prices
        """
        await self._initialize_accounts()
        if not self.accounts:
            raise Exception("No accounts available")
        
        # Use first account for this (it's a single call)
        account = self.accounts[0]
        return await account.get_all_floor_prices()
    
    async def get_gift_floor_price(self, gift_name: str) -> Optional[float]:
        """
        Get floor price for a specific gift
        
        Args:
            gift_name: Gift collection name
        
        Returns:
            Floor price in TON, or None if not found
        """
        await self._initialize_accounts()
        if not self.accounts:
            return None
        
        # Use first account
        account = self.accounts[0]
        return await account.get_gift_floor_price(gift_name)
    
    async def get_gift_price(
        self,
        gift_name: str,
        model: Optional[str] = None,
        backdrop: Optional[str] = None,
        symbol: Optional[str] = None
    ) -> Optional[float]:
        """
        Get the lowest price for a gift with optional attribute filters
        Uses round-robin account rotation
        
        Args:
            gift_name: Gift collection name
            model: Optional model filter
            backdrop: Optional backdrop filter
            symbol: Optional symbol/pattern filter
        
        Returns:
            Lowest price in TON, or None if not found
        """
        await self._initialize_accounts()
        if not self.accounts:
            return None
        
        # Get next account in rotation
        account = await self._get_next_account()
        return await account.get_gift_price(gift_name, model, backdrop, symbol)
    
    async def search_gifts(
        self,
        gift_name: Optional[str] = None,
        model: Optional[str] = None,
        backdrop: Optional[str] = None,
        symbol: Optional[str] = None,
        min_price: int = 0,
        max_price: int = 100000,
        sort: str = "price_asc",
        limit: int = 20,
        offset: int = 0
    ) -> List[Any]:
        """
        Search for gifts with filters using round-robin account rotation
        
        Args:
            gift_name: Gift collection name
            model: Model name filter
            backdrop: Backdrop name filter
            symbol: Symbol/pattern name filter
            min_price: Minimum price filter
            max_price: Maximum price filter
            sort: Sort order
            limit: Maximum results
            offset: Pagination offset
        
        Returns:
            List of PortalsGift objects
        """
        await self._initialize_accounts()
        if not self.accounts:
            return []
        
        # Get next account in rotation
        account = await self._get_next_account()
        return await account.search_gifts(
            gift_name, model, backdrop, symbol,
            min_price, max_price, sort, limit, offset
        )
    
    async def fetch_prices_parallel(
        self,
        gift_requests: List[Dict[str, Any]],
        max_concurrent: int = 3
    ) -> Dict[str, Optional[float]]:
        """
        Fetch prices for multiple gifts in parallel using all accounts
        
        Args:
            gift_requests: List of dicts with keys: gift_name, model, backdrop, symbol
            max_concurrent: Maximum concurrent requests per account
        
        Returns:
            Dictionary mapping gift identifiers to prices
        """
        await self._initialize_accounts()
        if not self.accounts:
            return {}
        
        results = {}
        
        # Create tasks for all requests
        async def fetch_single_price(request, account):
            """Fetch price for a single gift using specified account"""
            try:
                price = await account.get_gift_price(
                    gift_name=request.get("gift_name"),
                    model=request.get("model"),
                    backdrop=request.get("backdrop"),
                    symbol=request.get("symbol")
                )
                return request.get("id", request.get("gift_name")), price
            except Exception as e:
                return request.get("id", request.get("gift_name")), None
        
        # Distribute requests across accounts
        tasks = []
        for i, request in enumerate(gift_requests):
            account = self.accounts[i % len(self.accounts)]  # Round-robin distribution
            tasks.append(fetch_single_price(request, account))
        
        # Execute all tasks
        completed = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for result in completed:
            if isinstance(result, Exception):
                continue
            gift_id, price = result
            results[gift_id] = price
        
        return results


# Global multi-account instance
_multi_account_api: Optional[MultiAccountPortalMarketAPI] = None

async def get_multi_account_api(session_path: str = None) -> MultiAccountPortalMarketAPI:
    """Get or create global multi-account API instance"""
    global _multi_account_api
    if _multi_account_api is None:
        _multi_account_api = MultiAccountPortalMarketAPI(session_path)
    return _multi_account_api


# Backward compatibility function with multi-account support
async def get_portal_market_price_multi(
    slug: str,
    backdrop_name: Optional[str] = None,
    model_name: Optional[str] = None,
    symbol_name: Optional[str] = None,
    session_path: Optional[str] = None
) -> Optional[float]:
    """
    Get Portal Market price using multi-account API (round-robin)
    
    Args:
        slug: Gift slug (e.g., "LunarSnake-121736")
        backdrop_name: Optional backdrop name
        model_name: Optional model name
        symbol_name: Optional symbol/pattern name
        session_path: Path to session files
    
    Returns:
        Price in TON, or None if not found
    """
    try:
        api = await get_multi_account_api(session_path)
        collection_name = slug.split('-')[0] if '-' in slug else slug
        return await api.get_gift_price(
            gift_name=collection_name,
            model=model_name,
            backdrop=backdrop_name,
            symbol=symbol_name
        )
    except Exception:
        return None

