# Feed API Test Endpoint

## Test Endpoint

**URL**: `POST /api/feed/test`

**Purpose**: Create test feed events to test the live feed feature

## Usage

### 1. Create Game Win Events

```bash
curl -X POST http://localhost:3003/api/feed/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "game_win",
    "count": 5,
    "userId": 800092886
  }'
```

### 2. Create First Win Bonus Events

```bash
curl -X POST http://localhost:3003/api/feed/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "first_win_bonus",
    "count": 3
  }'
```

### 3. Create Task Complete Events

```bash
curl -X POST http://localhost:3003/api/feed/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "task_complete",
    "count": 10
  }'
```

### 4. Create Credit to TON Conversion Events

```bash
curl -X POST http://localhost:3003/api/feed/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "credit_to_ton",
    "count": 5
  }'
```

### 5. Create TON Withdrawal Events

```bash
curl -X POST http://localhost:3003/api/feed/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "ton_withdrawal",
    "count": 3
  }'
```

### 6. Create Streak Complete Events

```bash
curl -X POST http://localhost:3003/api/feed/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "streak_complete",
    "count": 2
  }'
```

### 7. Create Multiple Types at Once

Create 5 of each type:

```bash
# Game wins
curl -X POST http://localhost:3003/api/feed/test -H "Content-Type: application/json" -d '{"eventType":"game_win","count":5}'

# First wins
curl -X POST http://localhost:3003/api/feed/test -H "Content-Type: application/json" -d '{"eventType":"first_win_bonus","count":5}'

# Task completions
curl -X POST http://localhost:3003/api/feed/test -H "Content-Type: application/json" -d '{"eventType":"task_complete","count":5}'

# Credit conversions
curl -X POST http://localhost:3003/api/feed/test -H "Content-Type: application/json" -d '{"eventType":"credit_to_ton","count":5}'

# Withdrawals
curl -X POST http://localhost:3003/api/feed/test -H "Content-Type: application/json" -d '{"eventType":"ton_withdrawal","count":5}'

# Streak completions
curl -X POST http://localhost:3003/api/feed/test -H "Content-Type: application/json" -d '{"eventType":"streak_complete","count":5}'
```

## Available Event Types

- `game_win` - User wins a game
- `first_win_bonus` - First win bonus
- `task_complete` - Task completion
- `credit_to_ton` - Credit to TON conversion
- `ton_withdrawal` - TON withdrawal
- `streak_complete` - Streak completion

## Testing Live Feed

1. Open the app in your browser/Telegram
2. Navigate to the Feed tab
3. In another terminal, run the test API commands
4. Watch the feed update in real-time (every 2 seconds)

## Example Response

```json
{
  "success": true,
  "message": "Created 5 test game_win events",
  "events": [
    { "index": 1, "eventType": "game_win", "userId": 800092886 },
    { "index": 2, "eventType": "game_win", "userId": 800092886 },
    { "index": 3, "eventType": "game_win", "userId": 800092886 },
    { "index": 4, "eventType": "game_win", "userId": 800092886 },
    { "index": 5, "eventType": "game_win", "userId": 800092886 }
  ]
}
```
