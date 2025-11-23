# Portfolio Snapshot System - Analysis

## Goal
Create daily snapshots of every user's portfolio to track value changes and calculate profit/loss percentages.

## Current State

### Existing Infrastructure
1. **Portfolio Fetching:** `get_profile_gifts.py` - Fetches all gifts with prices
2. **Database:** SQLite with `portfolio_auto_gifts_cache` table
3. **API Endpoints:** `/api/portfolio/gifts` - Returns portfolio data
4. **Chart Endpoint:** `/api/portfolio/chart` - Already has some history logic (TODO)

### Data Available
- Total portfolio value
- Individual gift prices
- Gift counts (upgraded/unupgraded)
- Gift details (models, backdrops, etc.)

## Requirements

### What to Store
1. **Snapshot Metadata:**
   - `user_id` - User identifier
   - `snapshot_date` - Date of snapshot (YYYY-MM-DD)
   - `snapshot_timestamp` - Exact timestamp
   - `total_value` - Total portfolio value in TON
   - `gift_count` - Total number of gifts
   - `upgraded_count` - Number of upgraded gifts
   - `unupgraded_count` - Number of unupgraded gifts

2. **Gift-Level Data (Optional):**
   - Individual gift prices (for detailed analysis)
   - Gift IDs/slugs (to track which gifts changed)
   - This could be large - need to consider storage

3. **Calculated Metrics:**
   - Daily change (TON)
   - Daily change (%)
   - 7-day change
   - 30-day change
   - All-time high/low

## Database Schema Options

### Option 1: Simple Snapshot Table (Recommended)
```sql
CREATE TABLE portfolio_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    snapshot_date TEXT NOT NULL,  -- YYYY-MM-DD format
    snapshot_timestamp INTEGER NOT NULL,  -- Unix timestamp
    total_value REAL NOT NULL,
    gift_count INTEGER NOT NULL,
    upgraded_count INTEGER NOT NULL,
    unupgraded_count INTEGER NOT NULL,
    upgraded_value REAL DEFAULT 0,
    unupgraded_value REAL DEFAULT 0,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, snapshot_date)  -- One snapshot per user per day
);
CREATE INDEX idx_user_date ON portfolio_snapshots(user_id, snapshot_date);
```

**Pros:**
- Simple, fast queries
- Small storage footprint
- Easy to calculate daily changes
- Good for charts/trends

**Cons:**
- No individual gift tracking
- Can't see which gifts changed

### Option 2: Snapshot + Gift Details
```sql
CREATE TABLE portfolio_snapshots (
    -- Same as Option 1
);

CREATE TABLE portfolio_snapshot_gifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    gift_id TEXT,  -- Gift ID or slug
    gift_title TEXT,
    price REAL,
    is_upgraded INTEGER,
    FOREIGN KEY (snapshot_id) REFERENCES portfolio_snapshots(id)
);
CREATE INDEX idx_snapshot ON portfolio_snapshot_gifts(snapshot_id);
```

**Pros:**
- Track individual gift changes
- Can see which gifts gained/lost value
- More detailed analysis

**Cons:**
- Much larger storage (92 gifts × 365 days = 33,580 rows per user/year)
- Slower queries
- More complex

### Option 3: Hybrid (Recommended for Production)
```sql
-- Daily summary (Option 1)
CREATE TABLE portfolio_snapshots (
    -- Same as Option 1
);

-- Store only significant changes or monthly full snapshots
CREATE TABLE portfolio_gift_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    snapshot_date TEXT NOT NULL,
    gifts_json TEXT NOT NULL,  -- JSON array of all gifts
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, snapshot_date)
);
```

**Pros:**
- Daily summaries for fast queries
- Full gift data when needed (monthly)
- Balanced storage/functionality

**Cons:**
- More complex to maintain

## Snapshot Timing

### When to Take Snapshots

**Option A: Fixed Time (Recommended)**
- Time: 00:00 UTC (midnight)
- Pros: Consistent, predictable
- Cons: Might miss peak trading hours

**Option B: User Activity Based**
- Take snapshot when user opens portfolio
- Only if no snapshot exists for today
- Pros: Always fresh when user checks
- Cons: Inconsistent timing across users

**Option C: Multiple Times Daily**
- Morning, afternoon, evening
- Pros: More granular data
- Cons: 3x storage, might not be needed

**Recommendation:** Option A (midnight UTC) + Option B (on-demand if missing)

## Implementation Strategy

### 1. Snapshot Creation

**Location:** Python script or Next.js API route

**Trigger:**
- Cron job (daily at midnight UTC)
- Or on-demand when user views portfolio (if no snapshot today)

**Process:**
1. Fetch portfolio for user (use existing `get_profile_gifts.py`)
2. Calculate totals
3. Insert into `portfolio_snapshots` table
4. Handle duplicates (ON CONFLICT REPLACE or IGNORE)

### 2. Snapshot Service

**New File:** `bot/create_portfolio_snapshot.py`
- Takes user_id as input
- Fetches portfolio
- Saves snapshot to database
- Returns snapshot data

**New API Route:** `/api/portfolio/snapshot` (optional)
- Creates snapshot on-demand
- Returns snapshot data

### 3. Profit/Loss Calculation

**New API Route:** `/api/portfolio/profit-loss`

**Queries:**
```sql
-- Today's value
SELECT total_value FROM portfolio_snapshots 
WHERE user_id = ? AND snapshot_date = DATE('now');

-- Yesterday's value
SELECT total_value FROM portfolio_snapshots 
WHERE user_id = ? AND snapshot_date = DATE('now', '-1 day');

-- 7 days ago
SELECT total_value FROM portfolio_snapshots 
WHERE user_id = ? AND snapshot_date = DATE('now', '-7 days');

-- 30 days ago
SELECT total_value FROM portfolio_snapshots 
WHERE user_id = ? AND snapshot_date = DATE('now', '-30 days');

-- All-time high
SELECT MAX(total_value) FROM portfolio_snapshots WHERE user_id = ?;

-- All-time low
SELECT MIN(total_value) FROM portfolio_snapshots WHERE user_id = ?;
```

**Calculations:**
- Daily P/L = today_value - yesterday_value
- Daily P/L % = (today_value - yesterday_value) / yesterday_value * 100
- 7-day P/L = today_value - 7days_ago_value
- 30-day P/L = today_value - 30days_ago_value
- All-time high/low tracking

### 4. Chart Data

**Enhance:** `/api/portfolio/chart` endpoint

**Query:**
```sql
SELECT snapshot_date, total_value 
FROM portfolio_snapshots 
WHERE user_id = ? 
ORDER BY snapshot_date DESC 
LIMIT 90;  -- Last 90 days
```

## Scheduling

### Option 1: Cron Job (Recommended)
```bash
# Daily at midnight UTC
0 0 * * * cd /root/01studio/CollectibleKIT && python3 bot/create_portfolio_snapshot.py --all-users
```

**Pros:**
- Reliable
- Runs automatically
- Can batch process all users

**Cons:**
- Need to maintain cron job
- Need to handle errors

### Option 2: Next.js API Route + External Scheduler
- Create `/api/portfolio/snapshot-all` endpoint
- Use external service (cron-job.org, GitHub Actions, etc.) to call it
- Pros: No server cron needed
- Cons: External dependency

### Option 3: Background Worker
- Node.js worker that runs continuously
- Checks every hour if snapshot needed
- Pros: More control
- Cons: More complex

## Performance Considerations

### Storage Growth
- **Per user per day:** ~100 bytes (simple snapshot)
- **1000 users × 365 days:** ~36.5 MB/year
- **10,000 users × 365 days:** ~365 MB/year
- **Acceptable** - SQLite can handle this easily

### Query Performance
- Index on `(user_id, snapshot_date)` - Fast lookups
- Limit queries to last 90 days for charts
- Archive old data (>1 year) if needed

### Snapshot Creation Performance
- Batch process: Fetch all users, create snapshots
- Parallel processing: Process 10-20 users at a time
- Time estimate: 1000 users × 10 seconds = ~17 minutes

## Edge Cases

### 1. User Has No Portfolio
- Store snapshot with 0 value
- Still track for consistency

### 2. User Deletes Account
- Keep snapshots (historical data)
- Or soft delete (mark as deleted)

### 3. Missing Snapshots
- If snapshot fails, retry next day
- Or create on-demand when user views portfolio

### 4. Price Fetching Failures
- Store snapshot with partial data
- Mark as "incomplete" flag
- Or skip snapshot if too many failures

### 5. First Snapshot
- No previous data to compare
- Show "N/A" for P/L calculations
- Or use current value as baseline

## User Experience

### Display Options

**Dashboard Widget:**
```
📊 Portfolio Performance
Today: +5.2 TON (+2.1%)
7 Days: +15.5 TON (+6.8%)
30 Days: +45.0 TON (+20.1%)
All-Time High: 850.0 TON
```

**Chart View:**
- Line chart showing value over time
- Highlight profit/loss periods
- Show major events (gift purchases/sales)

**Detailed View:**
- Daily breakdown
- Best/worst days
- Trends (gaining/losing)

## Implementation Phases

### Phase 1: Basic Snapshot System
1. Create database table
2. Create snapshot script
3. Manual snapshot creation
4. Test with single user

### Phase 2: Automation
1. Set up cron job
2. Batch processing for all users
3. Error handling
4. Logging

### Phase 3: Profit/Loss API
1. Create P/L calculation endpoint
2. Add to frontend
3. Display in portfolio tab

### Phase 4: Charts & Analytics
1. Enhance chart endpoint
2. Add trends
3. Best/worst days
4. Historical comparisons

## Recommendations

### Database Schema: **Option 1 (Simple)**
- Start simple, add complexity later if needed
- Can always add gift-level tracking later

### Snapshot Timing: **Midnight UTC + On-Demand**
- Consistent daily snapshots
- On-demand for users who check before snapshot

### Storage: **Keep 1 year of data**
- Archive older data if needed
- 1 year is enough for meaningful trends

### Performance: **Batch Processing**
- Process users in batches of 20
- Use parallel processing
- Handle rate limits gracefully

### Error Handling: **Graceful Degradation**
- If snapshot fails, log and continue
- Don't block user portfolio viewing
- Retry failed snapshots next day

## Questions to Consider

1. **How many users?** - Affects storage and processing time
2. **How long to keep data?** - 1 year? Forever?
3. **Real-time vs Daily?** - Daily is sufficient for most use cases
4. **Individual gift tracking?** - Start without, add if needed
5. **Notification system?** - Alert users on big gains/losses?

## Next Steps

1. ✅ Study complete
2. ⏭️ Create database schema
3. ⏭️ Create snapshot script
4. ⏭️ Set up cron job
5. ⏭️ Create P/L API endpoint
6. ⏭️ Add to frontend

