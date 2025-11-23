# Portal Market API Wrapper - Working Version

## ✅ Created Working Wrapper

We've created a clean, working wrapper for Portal Market API that fixes all issues with the `aportalsmp` library.

## 📁 Files Created

1. **`bot/portal_market_api.py`** - Main API wrapper
2. **`bot/test_portal_market_api.py`** - Test script
3. **Updated `bot/get_profile_gifts.py`** - Now uses the wrapper

## 🔧 What It Fixes

### 1. Correct Domain
- ❌ Old: `portals-market.com` (doesn't exist)
- ✅ New: `portal-market.com` (correct domain)

### 2. Timeout
- ❌ Old: 15 seconds (too short)
- ✅ New: 60 seconds (enough time)

### 3. Rate Limiting
- ✅ Added automatic rate limiting (300ms between requests)
- ✅ Prevents 429 "too many requests" errors

### 4. Better Error Handling
- ✅ Graceful error handling
- ✅ Fallback strategies for price fetching

## 🎯 Usage

### Basic Usage

```python
from portal_market_api import PortalMarketAPI

# Initialize
api = PortalMarketAPI(
    api_id=YOUR_API_ID,
    api_hash=YOUR_API_HASH,
    session_name="portals_session",
    session_path="/path/to/sessions"
)

# Get all floor prices
floors = await api.get_all_floor_prices()
print(floors["lunarsnake"])  # 1.74 TON

# Get specific gift price
price = await api.get_gift_floor_price("LunarSnake")
print(price)  # 1.74 TON

# Search with filters
results = await api.search_gifts(
    gift_name="LunarSnake",
    model="Python Dev",
    backdrop="Roman Silver",
    limit=5
)

# Get price with attributes
price = await api.get_gift_price(
    gift_name="LunarSnake",
    model="Python Dev",
    backdrop="Roman Silver"
)
```

### Backward Compatibility

The wrapper includes a backward-compatible function:

```python
from portal_market_api import get_portal_market_price

price = await get_portal_market_price(
    slug="LunarSnake-121736",
    backdrop_name="Roman Silver",
    model_name="Python Dev",
    api_id=API_ID,
    api_hash=API_HASH
)
```

## 🧪 Testing

Run the test script:

```bash
python3 bot/test_portal_market_api.py
```

## 📊 Features

- ✅ **Automatic authentication** - Handles auth caching
- ✅ **Rate limiting** - Prevents API throttling
- ✅ **Error handling** - Graceful failures
- ✅ **Multiple search strategies** - Fallback for best results
- ✅ **Type hints** - Better IDE support
- ✅ **Clean API** - Easy to use

## 🔄 Migration

The wrapper is already integrated into `get_profile_gifts.py`. No changes needed!

## 🎉 Result

Portal Market API now works reliably with:
- ✅ Correct domain
- ✅ Proper timeout
- ✅ Rate limiting
- ✅ Better error handling

