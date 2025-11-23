# Portfolio Cache Strategy Analysis

## Current Flow

1. User opens portfolio tab
2. Check Next.js cache (5 min TTL)
3. If fresh → return immediately ✅
4. If stale/missing → **WAIT 8-30 seconds** for all prices ❌
5. Return complete portfolio

**Problem:** User waits 8-30 seconds on first load or after cache expires

## Proposed Flow

1. User opens portfolio tab
2. **Return cached portfolio immediately** (even if 1 hour old) ✅
3. **Start background fetch** in parallel
4. **Update cache progressively** as prices come in
5. Frontend polls/updates as prices refresh

## Analysis: Will This Make Flow Better or Worse?

### ✅ PROS (Better UX)

1. **Instant Display**
   - User sees portfolio immediately (0 seconds)
   - No blank screen or loading spinner
   - Can interact with portfolio while prices update

2. **Progressive Updates**
   - Prices appear as they're fetched
   - User sees "Updating..." indicators
   - More engaging experience

3. **Resilience**
   - Works even if API is slow/down
   - User always sees something
   - Graceful degradation

4. **Perceived Performance**
   - Feels instant (even if some prices are stale)
   - User can browse while prices update
   - Better than waiting 30 seconds

### ⚠️ CONS (Complexity)

1. **Code Complexity**
   - Need background job system
   - Need to handle concurrent fetches
   - Need state management (is_fetching flag)
   - More moving parts = more bugs

2. **Frontend Complexity**
   - Need polling or Server-Sent Events
   - Need to handle partial updates
   - Need to show "updating" states
   - More state management

3. **Race Conditions**
   - Multiple tabs open → multiple fetches?
   - Need locking mechanism
   - Need to handle stale updates

4. **Database Load**
   - More frequent writes
   - Need to handle partial updates
   - Cache invalidation logic

5. **Stale Data Display**
   - User might see old prices initially
   - Need clear "last updated" indicator
   - Might confuse users if prices change

## Recommendation: HYBRID APPROACH ✅

**Best of both worlds:**

### Phase 1: Immediate Return
- Return cached portfolio **immediately** (even if 1 hour old)
- Show "Last updated: X minutes ago" badge
- User can browse immediately

### Phase 2: Background Update
- Start background fetch (non-blocking)
- Update cache as prices come in
- Frontend polls every 2-3 seconds for updates

### Phase 3: Progressive UI
- Show "Updating prices..." indicator
- Update prices as they come in
- Hide indicator when complete

## Implementation Plan

### Database Schema
```sql
CREATE TABLE user_portfolio_cache (
    user_id INTEGER PRIMARY KEY,
    gifts_json TEXT NOT NULL,  -- JSON array of gifts
    total_value REAL,
    last_updated INTEGER,  -- Unix timestamp
    is_fetching BOOLEAN DEFAULT 0,
    fetch_started_at INTEGER,
    cache_version INTEGER DEFAULT 1
);
```

### Flow Logic

1. **On Portfolio Open:**
   ```python
   # Check cache
   cached = db.get_portfolio_cache(user_id)
   if cached:
       return cached  # Instant return
   
   # Start background fetch
   asyncio.create_task(update_portfolio_background(user_id))
   return cached or empty_portfolio
   ```

2. **Background Update:**
   ```python
   # Check if already fetching
   if db.is_fetching(user_id):
       return  # Skip if already in progress
   
   # Mark as fetching
   db.set_fetching(user_id, True)
   
   # Fetch prices in batches
   # Update cache progressively
   # Mark as complete
   ```

3. **Frontend:**
   ```typescript
   // Initial load
   const portfolio = await fetch('/api/portfolio/gifts')
   // Show immediately
   
   // Poll for updates
   setInterval(async () => {
     const updated = await fetch('/api/portfolio/gifts/status')
     if (updated) {
       // Update UI
     }
   }, 3000)
   ```

## Conclusion

**YES, this will make the flow MUCH BETTER!** ✅

**Why:**
- User sees portfolio instantly (0s vs 8-30s)
- Progressive updates feel responsive
- Better perceived performance
- Works even if API is slow

**Trade-offs:**
- More complex code (but manageable)
- Need to handle stale data (but acceptable)
- Frontend needs polling (but simple)

**Recommendation:** Implement it! The UX improvement is significant.

