<!-- f08f6f23-0b5a-45bd-8fbe-dd70091731af 7689d633-c150-484f-b1d3-59545dcc5565 -->
# Add Feed Tab to Games Section

## Database Schema Changes

### Create feed_events table in `bot/database.py`

Add a new table to store all feed events:

```python
CREATE TABLE IF NOT EXISTS feed_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,  -- 'ton_withdrawal', 'first_win', 'credit_earn', 'task_complete', 'game_win', 'streak_complete'
    event_data TEXT,  -- JSON with event details (amount, task_name, etc.)
    created_at REAL NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (user_id)
)
```

Add index for performance:

```python
CREATE INDEX IF NOT EXISTS idx_feed_events_created_at ON feed_events(created_at DESC)
```

### Add methods to BotDatabase class

- `record_feed_event(user_id, event_type, event_data)`: Insert new feed event
- `get_feed_events(limit=50)`: Get last N events with user info (JOIN with users table)

## Backend API Endpoints

### Create `/api/feed/events` endpoint

File: `webapp-nextjs/src/app/api/feed/events/route.ts`

GET endpoint that:

- Fetches last 50 feed events from database
- Joins with users table to get username, first_name, photo_url
- Returns JSON with event details formatted for frontend
- Includes timestamp, event type, user info, and event-specific data

## Frontend Database Integration

### Update `webapp-nextjs/src/lib/database.ts`

Add TypeScript interface:

```typescript
interface FeedEvent {
  id: number;
  user_id: number;
  username: string;
  first_name: string;
  event_type: string;
  event_data: any;
  created_at: number;
}
```

Add method:

- `getFeedEvents(limit: number = 50)`: Fetch feed events from database

## Frontend Components

### Create FeedTab component

File: `webapp-nextjs/src/components/tabs/FeedTab.tsx`

Component structure:

- Header with "Activity Feed" title
- Auto-refresh every 30 seconds using `useEffect` with interval
- Map through feed events and render FeedItem components
- Loading state while fetching
- Empty state if no events

### Create FeedItem component

Minimal, clean design showing:

- User profile photo (circular avatar)
- User first name
- Event description (e.g., "withdrew 0.2 TON", "earned first 0.1 TON bonus", "earned 1 credit")
- Relative timestamp (e.g., "2m ago", "1h ago", "3d ago")

Layout: Horizontal flex with avatar on left, text content in middle, timestamp on right

### Update GameTab.tsx

Add Feed tab navigation:

- Add tab button for "Feed" alongside emoji/zoom tabs
- Handle `currentSubTab === 'feed'` to render FeedTab component
- Update tab switching logic to include 'feed' option

## Event Recording Integration

### Update existing endpoints to record feed events

1. **Credit Conversion** (`/api/credits/convert/route.ts`):

   - After successful conversion, call `db.recordFeedEvent(userId, 'credit_to_ton', { credits, ton })`

2. **TON Withdrawal** (`/api/withdraw-rewards/route.ts`):

   - After successful withdrawal, call `db.recordFeedEvent(userId, 'ton_withdrawal', { amount })`

3. **Game Win** (`/api/game/submit-answer/route.ts`):

   - After recording game win, call `db.recordFeedEvent(userId, 'game_win', { credits: 1 })`
   - If first win, call `db.recordFeedEvent(userId, 'first_win_bonus', { ton: 0.1 })`

4. **Task Completion** (`/api/tasks/complete/route.ts`):

   - After task completion, call `db.recordFeedEvent(userId, 'task_complete', { taskTitle, credits })`

5. **Streak Completion** (`/api/tasks/streak/route.ts`):

   - When streak reaches 15 days, call `db.recordFeedEvent(userId, 'streak_complete', { days: 15 })`

## Styling

Use Tailwind CSS classes for minimal, clean design:

- Feed container: `space-y-2 px-4`
- Feed item: `flex items-center gap-3 p-3 bg-box-bg rounded-lg`
- Avatar: `w-10 h-10 rounded-full`
- Text: `text-sm text-text-idle`
- Timestamp: `text-xs text-text-active`

Event type colors:

- TON events: blue/cyan accent
- Credit events: yellow/amber accent
- Achievement events: green accent

### To-dos

- [ ] Update database schema with new columns (ton_balance, first_win_claimed, daily_wins_count, streak_days, etc.) and create new tables (credit_conversions, ton_withdrawals)
- [ ] Test complete earning flow - tasks, games, conversions, withdrawals, streak mission, premium vs free differences