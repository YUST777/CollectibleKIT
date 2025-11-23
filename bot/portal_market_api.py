#!/usr/bin/env python3
"""
Working Portal Market API wrapper
Fixes all issues with aportalsmp library:
- Correct domain: portal-market.com (not portals-market.com)
- Longer timeout: 60s (not 15s)
- Better error handling
- Rate limiting protection
"""
import asyncio
import sys
from typing import Optional, List, Dict, Any
from urllib.parse import quote_plus

# Apply fixes BEFORE importing aportalsmp
def _apply_portal_market_fixes():
    """Apply all fixes to aportalsmp library"""
    try:
        # Fix 1: Correct API URL (portal-market.com, not portals-market.com)
        import aportalsmp.utils.other as other_utils
        other_utils.API_URL = "https://portal-market.com/api/"
        other_utils.HEADERS_MAIN["Origin"] = "https://portal-market.com"
        other_utils.HEADERS_MAIN["Referer"] = "https://portal-market.com/"
        
        # Fix 2: Increase timeout from 15s to 60s
        import aportalsmp.handlers as handlers
        _original_fetch = handlers.fetch
        
        async def patched_fetch(method="GET", url="", headers=None, json=None, timeout=60, impersonate="chrome110"):
            """Patched fetch with 60s timeout"""
            return await _original_fetch(method, url, headers, json, timeout, impersonate)
        
        handlers.fetch = patched_fetch
        
        # Fix 3: Patch in modules that already imported API_URL
        import aportalsmp.gifts
        aportalsmp.gifts.API_URL = "https://portal-market.com/api/"
        aportalsmp.gifts.HEADERS_MAIN["Origin"] = "https://portal-market.com"
        aportalsmp.gifts.HEADERS_MAIN["Referer"] = "https://portal-market.com/"
        
        import aportalsmp.offers
        aportalsmp.offers.API_URL = "https://portal-market.com/api/"
        aportalsmp.offers.HEADERS_MAIN["Origin"] = "https://portal-market.com"
        aportalsmp.offers.HEADERS_MAIN["Referer"] = "https://portal-market.com/"
        
        import aportalsmp.account
        aportalsmp.account.API_URL = "https://portal-market.com/api/"
        aportalsmp.account.HEADERS_MAIN["Origin"] = "https://portal-market.com"
        aportalsmp.account.HEADERS_MAIN["Referer"] = "https://portal-market.com/"
        
        return True
    except Exception as e:
        print(f"⚠️ Warning: Could not apply all fixes: {e}", file=sys.stderr)
        return False

# Apply fixes
_apply_portal_market_fixes()

# Now import aportalsmp (with fixes applied)
from aportalsmp import update_auth, topOffer
from aportalsmp.gifts import giftsFloors, filterFloors, search as _search
from aportalsmp.utils.functions import toShortName
from aportalsmp.classes.Objects import PortalsGift, GiftsFloors, Filters

# Rate limiting with account rotation
import time
from collections import deque
_last_request_times = {}  # Per-account request times
_min_request_interval = 0.3  # 300ms between requests per account
_account_queue = deque()  # Round-robin account queue

async def _rate_limit(account_id=None):
    """Rate limiting to avoid 429 errors - per account"""
    if account_id:
        last_time = _last_request_times.get(account_id, 0)
        elapsed = time.time() - last_time
        if elapsed < _min_request_interval:
            await asyncio.sleep(_min_request_interval - elapsed)
        _last_request_times[account_id] = time.time()
    else:
        # Global rate limit if no account specified
        await asyncio.sleep(_min_request_interval)


class PortalMarketAPI:
    """Working Portal Market API wrapper"""
    
    def __init__(self, api_id: int, api_hash: str, session_name: str = "portals_session", session_path: str = None):
        """
        Initialize Portal Market API
        
        Args:
            api_id: Telegram API ID
            api_hash: Telegram API Hash
            session_name: Pyrogram session name
            session_path: Path to session files
        """
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_name = session_name
        self.session_path = session_path
        self._auth_data: Optional[str] = None
    
    async def authenticate(self) -> str:
        """
        Authenticate with Portal Market
        
        Returns:
            Auth data string
        """
        if self._auth_data:
            return self._auth_data
        
        try:
            self._auth_data = await update_auth(
                api_id=self.api_id,
                api_hash=self.api_hash,
                session_name=self.session_name,
                session_path=self.session_path
            )
            return self._auth_data
        except Exception as e:
            raise Exception(f"Portal Market authentication failed: {e}")
    
    async def get_all_floor_prices(self) -> Dict[str, float]:
        """
        Get floor prices for all gift collections
        
        Returns:
            Dictionary mapping gift names to floor prices
        """
        await self.authenticate()
        await _rate_limit()
        
        try:
            floors = await giftsFloors(authData=self._auth_data)
            # Convert to dict
            if hasattr(floors, 'floorPrices'):
                return floors.floorPrices
            elif hasattr(floors, '__dict__'):
                return floors.__dict__.get('floorPrices', {})
            return {}
        except Exception as e:
            raise Exception(f"Failed to get floor prices: {e}")
    
    async def get_gift_floor_price(self, gift_name: str) -> Optional[float]:
        """
        Get floor price for a specific gift
        
        Args:
            gift_name: Gift collection name (e.g., "LunarSnake", "IceCream")
        
        Returns:
            Floor price in TON, or None if not found
        """
        floors = await self.get_all_floor_prices()
        short_name = toShortName(gift_name).lower()
        return floors.get(short_name)
    
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
    ) -> List[PortalsGift]:
        """
        Search for gifts with filters
        
        Args:
            gift_name: Gift collection name
            model: Model name filter
            backdrop: Backdrop name filter
            symbol: Symbol/pattern name filter
            min_price: Minimum price filter
            max_price: Maximum price filter
            sort: Sort order (price_asc, price_desc, latest, etc.)
            limit: Maximum results
            offset: Pagination offset
        
        Returns:
            List of PortalsGift objects
        """
        await self.authenticate()
        await _rate_limit()
        
        try:
            results = await _search(
                sort=sort,
                offset=offset,
                limit=limit,
                gift_name=gift_name,
                model=model,
                backdrop=backdrop,
                symbol=symbol,
                min_price=min_price,
                max_price=max_price,
                authData=self._auth_data
            )
            return results if results else []
        except Exception as e:
            raise Exception(f"Failed to search gifts: {e}")
    
    async def get_gift_price(
        self,
        gift_name: str,
        model: Optional[str] = None,
        backdrop: Optional[str] = None,
        symbol: Optional[str] = None
    ) -> Optional[float]:
        """
        Get the best price for a gift with optional attribute filters
        Uses MAX(model_price, combo_price) for accuracy
        Special cases: Onyx Black and Black 2 backgrounds always use combo price
        
        Args:
            gift_name: Gift collection name
            model: Optional model filter
            backdrop: Optional backdrop filter
            symbol: Optional symbol/pattern filter (not used for pricing)
        
        Returns:
            Best price in TON, or None if not found
        """
        try:
            # Special cases: Onyx Black and Black 2 backgrounds always use model+background combo
            backdrop_lower = backdrop.lower() if backdrop else ""
            if backdrop and (backdrop_lower == "onyx black" or backdrop_lower == "black 2"):
                if model:
                    results = await self.search_gifts(
                        gift_name=gift_name,
                        model=model,
                        backdrop=backdrop,
                        limit=1,
                        sort="price_asc"
                    )
                    if results:
                        return float(results[0].price)
                # Fallback to backdrop only
                results = await self.search_gifts(
                    gift_name=gift_name,
                    backdrop=backdrop,
                    limit=1,
                    sort="price_asc"
                )
                if results:
                    return float(results[0].price)
                return await self.get_gift_floor_price(gift_name)
            
            # For other cases: fetch both model-only and model+background prices
            # Then use MAX (never underestimate)
            if model and backdrop:
                # Fetch both prices in parallel for speed
                model_task = self.search_gifts(
                    gift_name=gift_name,
                    model=model,
                    limit=1,
                    sort="price_asc"
                )
                combo_task = self.search_gifts(
                    gift_name=gift_name,
                    model=model,
                    backdrop=backdrop,
                    limit=1,
                    sort="price_asc"
                )
                
                # Execute in parallel
                model_results, combo_results = await asyncio.gather(
                    model_task, combo_task, return_exceptions=True
                )
                
                # Extract prices
                model_price = None
                combo_price = None
                
                if not isinstance(model_results, Exception) and model_results:
                    model_price = float(model_results[0].price)
                
                if not isinstance(combo_results, Exception) and combo_results:
                    combo_price = float(combo_results[0].price)
                
                # Use MAX (safe default - never underestimate)
                if model_price is not None and combo_price is not None:
                    return max(model_price, combo_price)
                elif combo_price is not None:
                    return combo_price
                elif model_price is not None:
                    return model_price
                else:
                    # Fallback to base floor price
                    return await self.get_gift_floor_price(gift_name)
            
            # If only model provided (no backdrop)
            if model:
                results = await self.search_gifts(
                    gift_name=gift_name,
                    model=model,
                    limit=1,
                    sort="price_asc"
                )
                if results:
                    return float(results[0].price)
            
            # If only backdrop provided (no model)
            if backdrop:
                results = await self.search_gifts(
                    gift_name=gift_name,
                    backdrop=backdrop,
                    limit=1,
                    sort="price_asc"
                )
                if results:
                    return float(results[0].price)
            
            # Fallback to base floor price
            return await self.get_gift_floor_price(gift_name)
        except Exception as e:
            # Return None on error (don't raise)
            return None
    
    async def get_filter_floors(self, gift_name: str) -> Optional[Filters]:
        """
        Get floor prices for models/backdrops/symbols for a gift
        
        Args:
            gift_name: Gift collection name
        
        Returns:
            Filters object with floor prices, or None
        """
        await self.authenticate()
        await _rate_limit()
        
        try:
            return await filterFloors(gift_name=gift_name, authData=self._auth_data)
        except Exception as e:
            raise Exception(f"Failed to get filter floors: {e}")
    
    async def get_top_offer(self, gift_name: str) -> Optional[Any]:
        """
        Get top offer for a gift collection
        
        Args:
            gift_name: Gift collection name
        
        Returns:
            CollectionOffer object, or None
        """
        await self.authenticate()
        await _rate_limit()
        
        try:
            short_name = toShortName(gift_name)
            return await topOffer(gift_name=short_name, authData=self._auth_data)
        except Exception as e:
            # topOffer might fail, return None
            return None


# Convenience functions for backward compatibility
async def get_portal_market_price(
    slug: str,
    backdrop_name: Optional[str] = None,
    model_name: Optional[str] = None,
    symbol_name: Optional[str] = None,
    portal_auth_data: Optional[str] = None,
    api_id: Optional[int] = None,
    api_hash: Optional[str] = None,
    session_name: str = "portals_session",
    session_path: Optional[str] = None
) -> Optional[float]:
    """
    Get Portal Market price for a gift (backward compatibility function)
    
    Args:
        slug: Gift slug (e.g., "LunarSnake-121736")
        backdrop_name: Optional backdrop name
        model_name: Optional model name
        symbol_name: Optional symbol/pattern name
        portal_auth_data: Optional pre-authenticated auth data
        api_id: Telegram API ID (required if portal_auth_data not provided)
        api_hash: Telegram API Hash (required if portal_auth_data not provided)
        session_name: Pyrogram session name
        session_path: Path to session files
    
    Returns:
        Price in TON, or None if not found
    """
    # Parse slug to get collection name
    collection_name = slug.split('-')[0] if '-' in slug else slug
    
    # Use provided auth or create new API instance
    if portal_auth_data and api_id and api_hash:
        # Create temporary API instance
        api = PortalMarketAPI(api_id, api_hash, session_name, session_path)
        api._auth_data = portal_auth_data
        return await api.get_gift_price(
            gift_name=collection_name,
            model=model_name,
            backdrop=backdrop_name,
            symbol=symbol_name
        )
    elif api_id and api_hash:
        api = PortalMarketAPI(api_id, api_hash, session_name, session_path)
        return await api.get_gift_price(
            gift_name=collection_name,
            model=model_name,
            backdrop=backdrop_name,
            symbol=symbol_name
        )
    else:
        return None

