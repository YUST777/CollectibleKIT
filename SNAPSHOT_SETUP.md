# Portfolio Snapshot System - Setup Complete

## ✅ Implementation Complete

### 1. Database Schema
- ✅ Created `portfolio_snapshots` table
- ✅ Added indexes for fast queries
- ✅ Stores: user_id, date, total_value, gift counts, upgraded/unupgraded values

### 2. Database Methods (TypeScript)
- ✅ `savePortfolioSnapshot()` - Save daily snapshot
- ✅ `getPortfolioSnapshot()` - Get snapshot for specific date
- ✅ `getPortfolioHistory()` - Get last N days of history
- ✅ `getProfitLoss()` - Calculate daily/weekly/monthly P/L

### 3. Python Snapshot Script
- ✅ `bot/create_portfolio_snapshot.py` - Creates snapshots
- ✅ Supports single user: `python3 bot/create_portfolio_snapshot.py <user_id>`
- ✅ Supports all users: `python3 bot/create_portfolio_snapshot.py --all-users`
- ✅ Batch processing (10 users at a time)
- ✅ Error handling

### 4. API Endpoints
- ✅ `/api/portfolio/profit-loss` - Get profit/loss data
- ✅ Auto-creates snapshot when user views portfolio (if missing)

### 5. Cron Job Script
- ✅ `bot/snapshot_cron.sh` - Daily snapshot script
- ✅ Logs to `logs/snapshot.log`

## Setup Cron Job

Add to crontab:
```bash
crontab -e
```

Add this line (runs daily at midnight UTC):
```
0 0 * * * /root/01studio/CollectibleKIT/bot/snapshot_cron.sh
```

Or run at specific time (e.g., 2 AM UTC):
```
0 2 * * * /root/01studio/CollectibleKIT/bot/snapshot_cron.sh
```

## Testing

### Test Single User Snapshot
```bash
cd /root/01studio/CollectibleKIT
python3 bot/create_portfolio_snapshot.py <user_id>
```

### Test All Users
```bash
cd /root/01studio/CollectibleKIT
python3 bot/create_portfolio_snapshot.py --all-users
```

### Test Profit/Loss API
```bash
# After creating snapshots, test the API
curl http://localhost:3000/api/portfolio/profit-loss
```

## Usage

### Frontend Integration

```typescript
// Get profit/loss data
const response = await fetch('/api/portfolio/profit-loss');
const { profit_loss } = await response.json();

// Display
console.log('Daily P/L:', profit_loss.daily);
console.log('Weekly P/L:', profit_loss.weekly);
console.log('Monthly P/L:', profit_loss.monthly);
console.log('All-time High:', profit_loss.all_time_high);
```

### Portfolio History Chart

```typescript
// Get history for chart
const history = await db.getPortfolioHistory(userId, 90); // Last 90 days
```

## Data Structure

### Snapshot Table
- `user_id` - User identifier
- `snapshot_date` - YYYY-MM-DD format
- `total_value` - Total portfolio value in TON
- `gift_count` - Total number of gifts
- `upgraded_count` - Number of upgraded gifts
- `unupgraded_count` - Number of unupgraded gifts
- `upgraded_value` - Total value of upgraded gifts
- `unupgraded_value` - Total value of unupgraded gifts

### Profit/Loss Response
```json
{
  "daily": {
    "change": 5.2,
    "change_percent": 2.1
  },
  "weekly": {
    "change": 15.5,
    "change_percent": 6.8
  },
  "monthly": {
    "change": 45.0,
    "change_percent": 20.1
  },
  "all_time_high": 850.0,
  "all_time_low": 500.0
}
```

## Performance

- **Storage:** ~100 bytes per user per day
- **10,000 users × 365 days:** ~365 MB/year
- **Processing time:** ~10 seconds per user
- **Batch size:** 10 users at a time (parallel)

## Next Steps

1. ✅ Database schema created
2. ✅ Snapshot script created
3. ✅ API endpoints created
4. ⏭️ Set up cron job (manual step)
5. ⏭️ Add frontend display
6. ⏭️ Test with real users

## Notes

- Snapshots are created automatically when user views portfolio (if missing)
- Cron job creates snapshots for all users daily
- One snapshot per user per day (UNIQUE constraint)
- Old snapshots are automatically replaced if script runs twice

