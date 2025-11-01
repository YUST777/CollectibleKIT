# Telegram Analytics SDK - Event Reference Guide

**Purpose**: Reference guide for all trackable events in CollectibleKIT Mini App

---

## Automatic Events (No Code Required)

These events are automatically tracked by the SDK once initialized:

| Event Name | Trigger | Data Collected |
|------------|---------|----------------|
| **app_launch** | User opens app | platform, version, user_id |
| **session_start** | User session begins | timestamp |
| **session_end** | User session ends | duration, timestamp |
| **wallet_connected** | TON wallet connected | wallet_type |
| **transaction_completed** | TON transaction sent | transaction_hash |
| **page_view** | Page navigation | page_name |

---

## Recommended Custom Events

### 1. Gift & Collection Events

#### gift_collected
**Trigger**: User saves/c collects a gift  
**Data**:
```typescript
{
  giftName: string;          // e.g., "Valentine Box"
  collectionName: string;    // e.g., "Valentines 2024"
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isRealGift: boolean;       // true if from Telegram gifts
  customDesign: boolean;     // true if user designed it
}
```
**Location**: `webapp-nextjs/src/components/tabs/CollectionTab.tsx`

#### gift_designed
**Trigger**: User creates custom gift design  
**Data**:
```typescript
{
  giftName: string;
  modelNumber: number;
  backdropIndex: number;
  patternIndex?: number;
  ribbonNumber?: number;
}
```

#### collection_created
**Trigger**: User creates public collection  
**Data**:
```typescript
{
  giftCount: number;
  collectionName: string;
  isPublic: boolean;
}
```

#### collection_viewed
**Trigger**: User browses collection  
**Data**:
```typescript
{
  collectionType: 'public' | 'private';
  itemCount: number;
  viewDuration: number;  // seconds
}
```

---

### 2. Story Events

#### story_created
**Trigger**: User uploads and cuts story image  
**Data**:
```typescript
{
  totalPieces: number;        // e.g., 12
  watermarkUsed: boolean;
  customWatermark?: string;
  creationTime: number;       // seconds
}
```
**Location**: `webapp-nextjs/src/components/tabs/StoryTab.tsx`

#### story_piece_shared
**Trigger**: User shares individual story piece  
**Data**:
```typescript
{
  pieceNumber: number;
  totalPieces: number;
  platform: 'telegram_stories';
  timestamp: number;
}
```

#### story_completed
**Trigger**: User shares all story pieces  
**Data**:
```typescript
{
  totalPieces: number;
  completionTime: number;     // total seconds
  shareCount: number;
}
```

---

### 3. Game Events

#### game_started
**Trigger**: User starts daily game  
**Data**:
```typescript
{
  gameType: 'puzzle' | 'quiz';
  gameId: string;
  timestamp: number;
}
```
**Location**: `webapp-nextjs/src/components/tabs/GameTab.tsx`

#### puzzle_completed
**Trigger**: User completes puzzle game  
**Data**:
```typescript
{
  gameId: string;
  totalPieces: number;
  completionTime: number;     // seconds
  attempts: number;
  giftName: string;
}
```

#### quiz_submitted
**Trigger**: User submits quiz answer  
**Data**:
```typescript
{
  gameId: string;
  selectedGift: string;
  selectedModel: string;
  correct: boolean;
  attempts: number;
}
```

#### quiz_completed
**Trigger**: User gets quiz answer correct  
**Data**:
```typescript
{
  gameId: string;
  attempts: number;
  totalTime: number;          // seconds
}
```

---

### 4. Task & Achievement Events

#### task_started
**Trigger**: User begins a promotional task  
**Data**:
```typescript
{
  taskId: string;
  taskType: string;
  timestamp: number;
}
```
**Location**: `webapp-nextjs/src/components/tabs/TasksTab.tsx`

#### task_completed
**Trigger**: User completes a task  
**Data**:
```typescript
{
  taskId: string;
  taskType: string;
  reward?: string;
  completionTime: number;
}
```

#### achievement_unlocked
**Trigger**: User earns achievement  
**Data**:
```typescript
{
  achievementId: string;
  achievementName: string;
  category: string;
}
```

---

### 5. Premium & Monetization Events

#### premium_viewed
**Trigger**: User views premium plans  
**Data**:
```typescript
{
  source: string;  // e.g., "home_tab", "modal"
  timestamp: number;
}
```

#### premium_purchased
**Trigger**: User completes premium purchase  
**Data**:
```typescript
{
  plan: 'monthly' | 'annual';
  price: number;
  currency: string;
  paymentMethod: string;
}
```

#### ad_shown
**Trigger**: Interstitial ad displayed  
**Data**:
```typescript
{
  adType: 'interstitial' | 'rewarded';
  location: string;
  timestamp: number;
}
```
**Location**: Ad integrations

#### ad_completed
**Trigger**: User completes ad viewing  
**Data**:
```typescript
{
  adType: string;
  duration: number;        // seconds watched
  rewardEarned: string;
}
```

#### reward_claimed
**Trigger**: User claims reward  
**Data**:
```typescript
{
  rewardType: string;
  amount: number;
  source: string;
}
```

---

### 6. Navigation & UI Events

#### tab_switched
**Trigger**: User switches between tabs  
**Data**:
```typescript
{
  fromTab: string;
  toTab: string;
  timestamp: number;
}
```

#### tab_viewed
**Trigger**: User views a tab  
**Data**:
```typescript
{
  tabName: string;
  duration: number;        // seconds on tab
}
```

#### modal_opened
**Trigger**: User opens modal/dialog  
**Data**:
```typescript
{
  modalType: string;
  trigger?: string;
}
```

#### filter_applied
**Trigger**: User applies filter/search  
**Data**:
```typescript
{
  filterType: string;
  value: string;
}
```

---

### 7. Social & Community Events

#### profile_viewed
**Trigger**: User views profile (own or other)  
**Data**:
```typescript
{
  viewedUserId: string;
  profileType: 'own' | 'other';
}
```

#### referral_shared
**Trigger**: User shares referral link  
**Data**:
```typescript
{
  method: string;  // e.g., "telegram", "copy_link"
  timestamp: number;
}
```

#### feed_interaction
**Trigger**: User interacts with feed  
**Data**:
```typescript
{
  action: 'like' | 'comment' | 'share' | 'view';
  itemType: string;
  itemId: string;
}
```

---

### 8. TON Wallet Events

#### withdrawal_requested
**Trigger**: User initiates withdrawal  
**Data**:
```typescript
{
  amount: number;
  currency: string;
  walletAddress: string;  // hashed or masked
}
```

#### wallet_balance_checked
**Trigger**: User checks balance  
**Data**:
```typescript
{
  currency: string;
  hasBalance: boolean;
}
```

---

### 9. Error & Support Events

#### error_occurred
**Trigger**: App error happens  
**Data**:
```typescript
{
  errorType: string;
  errorMessage: string;
  location: string;
  userId?: string;
}
```

#### support_contacted
**Trigger**: User contacts support  
**Data**:
```typescript
{
  method: 'email' | 'telegram' | 'help_center';
  issueType: string;
}
```

---

## Implementation Examples

### Basic Event Tracking

```typescript
import { trackTelegramAnalytics } from '@/lib/telegram';

// Simple event
trackTelegramAnalytics('button_clicked', {
  buttonName: 'share_story'
});

// Event with user context
trackTelegramAnalytics('story_created', {
  totalPieces: 12,
  watermarkUsed: true,
  creationTime: 45
});
```

### Conditional Tracking

```typescript
const handleGiftSave = () => {
  // Business logic first
  if (currentSlot && selectedGiftName) {
    saveGiftToSlot();
    
    // Then track event
    trackTelegramAnalytics('gift_collected', {
      giftName: selectedGiftName,
      rarity: getRarity(selectedGiftName),
      slot: currentSlot
    });
    
    toast.success('Gift saved!');
  }
};
```

### Timer-Based Tracking

```typescript
const startTime = Date.now();

const handlePuzzleComplete = () => {
  const completionTime = Math.round((Date.now() - startTime) / 1000);
  
  trackTelegramAnalytics('puzzle_completed', {
    gameId: currentGame.id,
    totalPieces: 12,
    completionTime,
    attempts: attemptCount
  });
};
```

---

## Event Naming Conventions

### General Rules
1. Use lowercase with underscores: `event_name`
2. Be descriptive: `gift_collected` not `collect`
3. Use past tense for completed actions: `puzzle_completed`
4. Be consistent: `tab_switched` across all tabs

### Common Patterns
- `{action}_completed` - Task/game completed
- `{item}_{action}` - Specific item action
- `{feature}_accessed` - Feature usage
- `{user_type}_event` - User-specific events

---

## Best Practices

### 1. Timing
- Track after action completes, not before
- Include timing for performance analysis
- Capture user flow progression

### 2. Data Privacy
- Never track sensitive data
- Hash or mask user identifiers
- Anonymize personal information

### 3. Performance
- Keep event data lightweight
- Avoid tracking in loops
- Batch related events when possible

### 4. Reliability
- Wrap in try-catch blocks
- Never let tracking break app
- Use silent failures

### 5. Validation
- Verify events in staging
- Check dashboard for data
- Monitor for missing events

---

## Dashboard Queries

### Daily Active Users
```
Event: app_launch
Group by: day
Filter: Distinct users
```

### Conversion Funnel
```
Event sequence:
1. app_launch
2. collection_viewed
3. gift_collected
4. story_created
5. story_completed
```

### Premium Conversion
```
Event: premium_purchased
Metric: % of users who viewed premium
Time range: Last 30 days
```

### Engagement Score
```
Weighted events:
- app_launch: 1x
- gift_collected: 2x
- story_created: 3x
- puzzle_completed: 4x
```

---

## Troubleshooting

### Event Not Appearing
1. Check event name spelling
2. Verify SDK initialized
3. Check network connectivity
4. Verify token validity
5. Wait 5-10 minutes for propagation

### Wrong Data
1. Check event properties
2. Verify data types match
3. Check for null/undefined values
4. Review console logs
5. Test with sample data

### Too Many Events
1. Review tracking calls
2. Check for duplicate events
3. Verify batching enabled
4. Analyze frequency
5. Optimize tracking strategy

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Related Docs**: 
- [SDK Integration Study](./SDK_INTEGRATION_STUDY.md)
- [Implementation Checklist](./SDK_IMPLEMENTATION_CHECKLIST.md)
- [Analytics Guide](./TELEGRAM_ANALYTICS_GUIDE.md)

