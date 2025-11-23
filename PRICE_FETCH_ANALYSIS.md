# Why Some Gifts Show N/A Price - Analysis

## Problem
User has 4 identical Lunar Snake NFTs (same model, same background):
- #121736: ✅ 3.50 TON
- #131599: ❌ N/A
- #171067: ✅ 3.50 TON  
- #127682: ✅ 3.50 TON

## Root Causes

### 1. **Parallel Batch Processing Errors**
**Current Implementation:**
- Prices fetched in batches of 8 (parallel)
- Uses `asyncio.gather(..., return_exceptions=True)`
- If one request fails, it's silently ignored

**What happens:**
```python
results = await asyncio.gather(*tasks, return_exceptions=True)
# If gift #131599's request fails:
# - Exception is caught
# - Price remains None
# - Shows as N/A
```

**Why it fails:**
- API timeout for that specific request
- Rate limiting hit during that request
- Network error
- Portal Market API temporary error

### 2. **No Retry Logic**
**Current behavior:**
- If price fetch fails → N/A
- No retry attempt
- No fallback strategy

**What should happen:**
- Retry failed requests (1-2 times)
- Fallback to sequential fetch if parallel fails
- Log which gifts failed for debugging

### 3. **Silent Error Handling**
**Current code:**
```python
except Exception as e:
    # Silently handle errors - price will remain None
    pass
```

**Problem:**
- Errors are swallowed
- No logging of which gift failed
- No way to debug why #131599 failed

### 4. **Rate Limiting**
**Scenario:**
- Batch of 8 requests sent
- First 7 succeed
- 8th request (#131599) hits rate limit
- Returns error → N/A

**Why it happens:**
- Portal Market has rate limits
- Even with 4 accounts, can hit limits
- Batch processing might overwhelm API

### 5. **Gift Not Listed**
**Possibility:**
- Gift #131599 might not be listed on Portal Market
- Search returns empty
- Price = None → N/A

**But unlikely:**
- Same model + backdrop as others
- Should find same floor price
- More likely a fetch error

## Solutions

### Solution 1: Add Retry Logic (Recommended)
```python
async def get_price_with_retry(api, req, max_retries=2):
    for attempt in range(max_retries):
        try:
            price = await api.get_gift_price(...)
            if price:
                return price
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"Failed after {max_retries} attempts: {e}")
            await asyncio.sleep(0.5 * (attempt + 1))  # Exponential backoff
    return None
```

### Solution 2: Sequential Fallback
```python
# If parallel batch fails, try sequential
if price is None:
    # Retry sequentially with delay
    price = await api.get_gift_price(...)
```

### Solution 3: Better Error Logging
```python
except Exception as e:
    print(f"⚠️ Price fetch failed for {gift_slug}: {e}", file=sys.stderr)
    # Still return None, but log the error
```

### Solution 4: Smaller Batches
```python
# Reduce batch size from 8 to 4
batch_size = 4  # Less likely to hit rate limits
```

### Solution 5: Stagger Requests
```python
# Add small delay between batches
await asyncio.sleep(0.5)  # Give API time to recover
```

## Recommended Fix

**Immediate:**
1. Add retry logic (2 retries per gift)
2. Better error logging
3. Sequential fallback for failed gifts

**Long-term:**
1. Track which gifts consistently fail
2. Cache failed gifts to avoid repeated attempts
3. Implement exponential backoff
4. Add monitoring/alerting for high failure rates

## Why This Happens

**Most Likely Cause:**
- **Rate limiting** during parallel batch
- Gift #131599's request hit rate limit
- Exception caught → N/A

**Evidence:**
- 3 out of 4 succeeded (75% success)
- Same gift type (should all work)
- Random failure (not consistent pattern)

**Solution:**
- Add retry with backoff
- Reduce batch size
- Better error handling

