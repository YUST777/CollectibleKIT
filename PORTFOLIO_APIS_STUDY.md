# Portfolio Tab APIs & Gift Stats - Complete Study

## 📊 Overview

The Portfolio Tab in CollectibleKIT provides comprehensive tracking and analytics for Telegram Star Gifts and Stickers. This document details all APIs, data structures, and gift statistics calculations.

---

## 🔌 API Endpoints

### 1. `/api/portfolio/gifts` (GET)
**Purpose:** Fetch user's saved Telegram Star Gifts with Portal Market prices

**Features:**
- Rate limiting: 1 request per minute
- Caching: 5-minute cache with stale fallback
- Python script integration: `bot/get_profile_gifts.py`
- Error handling: Returns stale cache on errors

**Request:**
- Authentication: Telegram initData header
- No query parameters

**Response:**
```json
{
  "success": true,
  "gifts": [
    {
      "slug": "TamaGadget-65287",
      "title": "Tama Gadget",
      "gift_id": 123456,
      "num": 65287,
      "fragment_url": "https://nft.fragment.com/gift/tamagadget-65287.medium.jpg",
      "fragment_link": "https://t.me/nft/TamaGadget-65287",
      "total_supply": "1234/10000",
      "availability_issued": 1234,
      "availability_total": 10000,
      "model_name": "Sunflower",
      "backdrop_name": "Ocean",
      "pattern_name": "Stars",
      "model_display": "Sunflower 0.3%",
      "backdrop_display": "Ocean 1.2%",
      "pattern_display": "Stars 0.1%",
      "model_rarity": 0.3,
      "backdrop_rarity": 1.2,
      "pattern_rarity": 0.1,
      "price": 0.5,
      "pinned": false,
      "is_upgraded": true
    }
  ],
  "total": 150,
  "nft_count": 45,
  "total_value": 125.5,
  "cached": false,
  "cache_age_seconds": 0
}
```

**Gift Types:**
1. **Upgraded Gifts** (`is_upgraded: true`)
   - Have slug (e.g., "TamaGadget-65287")
   - Have attributes (model, backdrop, pattern)
   - Have rarity percentages
   - Price from Portal Market with attribute filters

2. **Unupgraded Gifts** (`is_unupgraded: true`)
   - Can be upgraded but user hasn't minted
   - No slug or attributes
   - Price from Portal Market floor (no attributes)

3. **Unupgradeable Gifts** (`is_unupgradeable: true`)
   - Cannot be upgraded (no mint available)
   - Use numeric gift_id
   - Price from MRKT/Quant APIs
   - Image: `https://cdn.changes.tg/gifts/originals/{gift_id}/Original.png`

**Python Script:** `bot/get_profile_gifts.py`
- Uses Telethon `GetSavedStarGiftsRequest`
- Fetches all gifts with pagination
- Integrates Portal Market API for prices
- Handles unupgradeable gift prices

---

### 2. `/api/portfolio/gift-metadata` (GET)
**Purpose:** Fetch gift attributes from Telegram NFT page

**Query Parameters:**
- `gift_name`: Gift collection name (e.g., "PetSnake")
- `item_id`: Gift item number (e.g., 60869)

**Response:**
```json
{
  "success": true,
  "gift_name": "PetSnake",
  "item_id": 60869,
  "model": "Sunflower",
  "backdrop": "Ocean",
  "symbol": "Stars",
  "quantity": "1234/10000",
  "owner_username": "username",
  "owner_name": "Display Name",
  "attributes": {
    "Model": "Sunflower 0.3%",
    "Backdrop": "Ocean 1.2%",
    "Symbol": "Stars 0.1%",
    "Quantity": "1234/10000"
  }
}
```

**Python Script:** `bot/get_gift_metadata.py`
- Scrapes `https://t.me/nft/{gift_name}-{item_id}`
- Extracts attributes from HTML table
- Parses rarity percentages
- Returns cleaned attribute names

---

### 3. `/api/portfolio/gift-chart` (GET)
**Purpose:** Fetch price chart data for a specific gift

**Query Parameters:**
- `name`: Gift name (required)
- `type`: Chart type - `24h`, `3d`, `1w`, `1m`, `3m` (default: `1w`)

**External API:** `https://giftcharts-api.onrender.com/`
- `weekChart`: For 1w, 24h, 3d
- `lifeChart`: For 1m, 3m

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "createdAt": "2024-01-15T10:00:00Z",
      "priceUsd": 0.5
    }
  ]
}
```

**Filtering:**
- `24h`: Last 24 hours
- `3d`: Last 3 days
- `1w`: Last week (all data)
- `1m`: Last 30 days
- `3m`: All-time data

---

### 4. `/api/portfolio/chart` (GET/POST)
**Purpose:** Portfolio value history tracking

**GET:** Fetch portfolio history
**Response:**
```json
{
  "success": true,
  "history": [
    {
      "date": "2024-01-15",
      "total_value": 125.5,
      "gifts_count": 45
    }
  ]
}
```

**POST:** Save portfolio snapshot
**Body:**
```json
{
  "totalValue": 125.5,
  "giftsCount": 45
}
```

**Database:** SQLite stores portfolio snapshots for charting

---

### 5. `/api/portfolio/aggregated-chart` (GET/POST)
**Purpose:** Combined portfolio chart (all gifts aggregated)

**Query Parameters:**
- `type`: `24h`, `3d`, `1w`, `1m`, `life` (default: `1w`)
- `mode`: `gift` or `model` (default: `gift`)

**POST Body (optional):**
```json
{
  "gifts": [/* array of gift objects */]
}
```

**Algorithm:**
1. Fetch chart data for each unique gift name
2. Multiply price by quantity (how many of that gift user has)
3. Aggregate prices by timestamp
4. Sum all gift values per time point

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "date": "2024-01-15T10:00:00Z",
      "priceUsd": 125.5,
      "price": 125.5
    }
  ]
}
```

---

### 6. `/api/portfolio/account-gifts` (GET)
**Purpose:** Fetch unupgradeable gifts from a Telegram account

**Query Parameters:**
- `account`: Account username (required)

**Python Script:** `bot/get_account_gifts.py`
- Uses Telethon to fetch account gifts
- Returns unupgradeable gifts only

---

### 7. `/api/portfolio/channel-gifts` (GET)
**Purpose:** Fetch unupgradeable gifts from a Telegram channel

**Query Parameters:**
- `channel`: Channel username (required)

**Python Script:** `bot/get_channel_gifts.py`
- Uses Telethon to fetch channel gifts
- Returns unupgradeable gifts only

---

### 8. `/api/portfolio/unupgradeable-gifts` (GET)
**Purpose:** Get all unupgradeable gifts (the 29 special gifts)

**Response:**
```json
{
  "success": true,
  "gifts": [
    {
      "id": "5775955135867913556",
      "name": "Gravestone",
      "shortName": "Gravestone",
      "floorPrice": 0.5,
      "imageUrl": "https://cdn.changes.tg/gifts/originals/5775955135867913556/Original.png",
      "supply": 1000
    }
  ]
}
```

**Data Source:** `mrktandquantomapi/quant/clean_unique_gifts.json`
- Filters `type === 'REGULAR'`
- Constructs image URLs from gift IDs

---

### 9. `/api/portfolio/sticker-price` (GET)
**Purpose:** Fetch sticker price from stickers.tools API

**Query Parameters:**
- `collection`: Collection name (required)
- `pack`: Pack/sticker name (required)

**External API:** `https://stickers.tools/api/stats-new`

**Response:**
```json
{
  "success": true,
  "init_price_usd": 10.5,
  "current_price_usd": 12.3
}
```

---

### 10. `/api/portal-market/price` (POST)
**Purpose:** Get Portal Market floor price for a gift

**Body:**
```json
{
  "gift_name": "TamaGadget",
  "model_name": "Sunflower",
  "backdrop_name": "Ocean"
}
```

**Python Script:** `bot/get_portal_price.py`
- Uses `aportalsmp` library
- Searches with attribute filters
- Falls back to gift name only if no results

**Response:**
```json
{
  "success": true,
  "price": 0.5,
  "cached": false
}
```

**Search Strategy:**
1. Try: gift_name + backdrop + model
2. Fallback: gift_name + backdrop
3. Fallback: gift_name only

---

## 📈 Gift Statistics

### Price Sources

#### 1. Portal Market (Upgraded Gifts)
- **API:** `aportalsmp` library
- **Method:** Search with attribute filters
- **Accuracy:** Most accurate (specific model/backdrop/pattern)
- **Fallback:** Base gift floor price

#### 2. MRKT API (Unupgradeable Gifts)
- **API:** `https://api.tgmrkt.io/api/v1/gifts/collections`
- **Auth:** JWT token via Telegram WebView
- **Coverage:** 6 special gifts (Gravestone, Coffin, Mask, Durov's items)
- **Format:** nanoTONs → converted to TON

#### 3. Quant Marketplace (Unupgradeable Gifts)
- **API:** `https://quant-marketplace.com/api/gifts/gifts`
- **Auth:** Bearer token (Telegram initData)
- **Coverage:** 29 unupgradeable gifts
- **Protection:** Cloudflare bypass (cloudscraper)

#### 4. Unupgradeable Prices Cache
- **File:** `bot/unupgradeable_prices_cache.json`
- **TTL:** 1 hour
- **Fallback:** Used when APIs don't have listing
- **Source Priority:**
  1. MRKT (for 6 special IDs)
  2. Quant (for others)
  3. Cache (if API unavailable)

**Python Script:** `bot/get_unupgradeable_prices.py`
- Fetches from both MRKT and Quant
- Merges prices with priority logic
- Updates cache with fresh prices
- Returns ID-based price dictionary

---

### Gift Attributes & Rarity

#### Attributes Structure
```typescript
{
  model_name: string;        // e.g., "Sunflower"
  backdrop_name: string;     // e.g., "Ocean"
  pattern_name: string;      // e.g., "Stars"
  model_rarity: number;       // e.g., 0.3 (percentage)
  backdrop_rarity: number;    // e.g., 1.2 (percentage)
  pattern_rarity: number;     // e.g., 0.1 (percentage)
  model_display: string;     // e.g., "Sunflower 0.3%"
  backdrop_display: string;  // e.g., "Ocean 1.2%"
  pattern_display: string;   // e.g., "Stars 0.1%"
}
```

#### Rarity Calculation
- **Source:** Telegram `StarGiftAttribute` objects
- **Format:** `rarity_permille / 10` = percentage
- **Example:** `3 permille` = `0.3%`

---

### Supply Information

#### Total Supply Format
```typescript
{
  total_supply: string;           // "1234/10000"
  availability_issued: number;    // 1234
  availability_total: number;     // 10000
}
```

#### Supply Sources
1. **Upgraded Gifts:** From `StarGiftUnique.availability_*`
2. **Unupgradeable Gifts:** From Quant static data
3. **Unupgraded Gifts:** From `StarGift.availability_remains`

---

### Image URLs

#### Upgraded Gifts
```
https://nft.fragment.com/gift/{slug_lower}-{num}.medium.jpg
```
Example: `https://nft.fragment.com/gift/tamagadget-65287.medium.jpg`

#### Unupgradeable Gifts
```
https://cdn.changes.tg/gifts/originals/{gift_id}/Original.png
```
Example: `https://cdn.changes.tg/gifts/originals/5775955135867913556/Original.png`

#### Telegram Links
```
https://t.me/nft/{slug}
```
Example: `https://t.me/nft/TamaGadget-65287`

---

## 💰 Price Calculation Logic

### Upgraded Gift Pricing
1. **Primary:** Portal Market with exact attributes (model + backdrop + pattern)
2. **Fallback 1:** Portal Market with backdrop only
3. **Fallback 2:** Portal Market base gift floor

### Unupgradeable Gift Pricing
1. **MRKT Priority:** For 6 special IDs (Gravestone, Coffin, Mask, Durov's items)
2. **Quant Priority:** For other 23 gifts
3. **Cache Fallback:** 1-hour cache if API unavailable

### Unupgraded Gift Pricing
1. **Portal Market:** Base gift floor price (no attributes)
2. **No Price:** If gift not listed

---

## 📊 Portfolio Value Calculation

### Total Value Formula
```javascript
total_value = gifts.reduce((sum, gift) => {
  return sum + (gift.price || 0);
}, 0);
```

### Aggregated Chart Calculation
```javascript
// For each time point:
aggregated_price = gifts.reduce((sum, gift) => {
  const giftPrice = getPriceAtTime(gift, timestamp);
  const giftQuantity = countGiftsWithName(gift.title);
  return sum + (giftPrice * giftQuantity);
}, 0);
```

---

## 🔄 Caching Strategy

### Portfolio Gifts Cache
- **Duration:** 5 minutes
- **Storage:** SQLite database
- **Key:** User ID
- **Fallback:** Stale cache on errors
- **Rate Limit:** 1 request per minute

### Unupgradeable Prices Cache
- **Duration:** 1 hour
- **Storage:** JSON file (`unupgradeable_prices_cache.json`)
- **Format:**
```json
{
  "gift_id": {
    "price": 0.5,
    "timestamp": 1705312800,
    "source": "mrkt" | "quant"
  }
}
```

---

## 🎯 Gift Statistics Display

### Individual Gift Stats
- **Price:** Portal Market floor (with attributes)
- **Rarity:** Model/Backdrop/Pattern percentages
- **Supply:** Issued/Total format
- **Chart:** Price history (24h/3d/1w/1m/3m)
- **Owner:** Username and display name (if available)

### Portfolio Stats
- **Total Value:** Sum of all gift prices
- **NFT Count:** Number of upgraded gifts
- **Total Gifts:** All gifts (upgraded + unupgraded + unupgradeable)
- **Chart:** Aggregated portfolio value over time

### Collection Stats
- **By Gift Name:** Count and total value per collection
- **By Model:** Count and total value per model
- **By Backdrop:** Count and total value per backdrop
- **By Pattern:** Count and total value per pattern

---

## 🔐 Authentication

### Telegram InitData
- **Header:** `X-Telegram-Init-Data`
- **Usage:** User authentication for portfolio access
- **Validation:** Server-side verification

### Portal Market Auth
- **Method:** Telethon WebView request
- **Session:** `portals_session.session`
- **Library:** `aportalsmp.update_auth()`

### MRKT API Auth
- **Method:** Telegram WebView → JWT token
- **Bot:** `@main_mrkt_bot`
- **Endpoint:** `https://api.tgmrkt.io/api/v1/auth`

### Quant API Auth
- **Method:** Telegram WebView → Bearer token
- **Bot:** `@QuantMarketRobot`
- **Format:** Direct initData as Bearer token

---

## 🐍 Python Scripts

### `get_profile_gifts.py`
**Purpose:** Fetch user's saved gifts with prices

**Features:**
- Telethon `GetSavedStarGiftsRequest`
- Portal Market price integration
- Unupgradeable price lookup
- Attribute extraction
- Supply information

**Output:** JSON with gifts array and total value

### `get_gift_metadata.py`
**Purpose:** Scrape gift attributes from Telegram NFT page

**Features:**
- HTML parsing with BeautifulSoup
- Attribute extraction from table
- Rarity percentage parsing
- Owner information extraction

**Output:** JSON with model, backdrop, symbol, quantity

### `get_gift_price.py`
**Purpose:** Get Portal Market price for a gift

**Features:**
- Attribute-based search
- Fallback search strategies
- Error handling

**Output:** JSON with price or error

### `get_portal_price.py`
**Purpose:** Portal Market price lookup (CLI version)

**Features:**
- Command-line arguments
- Attribute filtering
- Multiple fallback attempts

**Output:** JSON with price

### `get_unupgradeable_prices.py`
**Purpose:** Fetch prices for 29 unupgradeable gifts

**Features:**
- MRKT API integration
- Quant API integration
- 1-hour cache system
- Priority-based price merging
- Static file fallback

**Output:** JSON with gift_id → price mapping

---

## 📱 Frontend Integration

### PortfolioTab Component
**Location:** `webapp-nextjs/src/components/tabs/PortfolioTab.tsx`

**Features:**
- Gift list with filtering
- Price fetching with loading states
- Chart visualization
- Currency toggle (TON/USD)
- Gift details modal
- Add custom gifts
- Channel/account gift import

**State Management:**
- `gifts`: Array of portfolio gifts
- `totalValue`: Sum of all prices
- `portfolioHistory`: Historical snapshots
- `chartData`: Individual gift chart
- `portfolioChartData`: Aggregated chart

---

## 🔄 Data Flow

### Portfolio Load Flow
1. User opens Portfolio tab
2. Frontend calls `/api/portfolio/gifts`
3. API checks cache (5 min TTL)
4. If cache miss or stale:
   - Spawn Python script `get_profile_gifts.py`
   - Script fetches gifts via Telethon
   - Script fetches prices from Portal Market
   - Script looks up unupgradeable prices
   - Returns JSON
5. API caches result
6. Frontend displays gifts with prices

### Price Update Flow
1. User clicks on gift
2. Frontend calls `/api/portal-market/price` with attributes
3. API spawns `get_portal_price.py`
4. Script searches Portal Market with filters
5. Returns floor price
6. Frontend updates gift price

### Chart Load Flow
1. User selects gift for chart
2. Frontend calls `/api/portfolio/gift-chart?name={name}&type={type}`
3. API fetches from `giftcharts-api.onrender.com`
4. Filters data by time range
5. Returns chart points
6. Frontend renders chart

---

## ⚠️ Error Handling

### API Errors
- **Rate Limit:** Returns stale cache with message
- **Python Script Error:** Returns stale cache if available
- **Network Error:** Returns empty array or cached data
- **Parse Error:** Returns error with fallback to cache

### Price Errors
- **No Listing:** Returns `null` price
- **API Unavailable:** Uses cache (1 hour TTL)
- **Attribute Mismatch:** Falls back to base gift price

---

## 📊 Performance Optimizations

### Caching
- 5-minute cache for portfolio gifts
- 1-hour cache for unupgradeable prices
- Stale cache fallback on errors

### Rate Limiting
- 1 request per minute for portfolio refresh
- Prevents API abuse
- Encourages cache usage

### Parallel Fetching
- Aggregated chart fetches all gift charts in parallel
- Uses `Promise.all()` for concurrent requests

### Lazy Loading
- Chart data loaded on demand
- Gift metadata fetched when needed
- Images loaded as user scrolls

---

## 🎨 UI Features

### Gift Display
- Image thumbnail
- Gift name and number
- Attributes with rarity
- Price in TON/USD
- Supply information
- Pinned indicator

### Chart Visualization
- Line chart with time series
- Multiple time ranges
- Price in USD
- Smooth animations

### Filtering & Search
- Search by gift name
- Filter by type (upgraded/unupgraded/unupgradeable)
- Sort by price/value/rarity
- Group by collection

---

## 🔮 Future Enhancements

### Planned Features
- Real-time price updates
- Price alerts
- Portfolio comparison
- Export to CSV
- Advanced analytics
- Rarity-based sorting
- Collection grouping
- Historical P&L

---

**Last Updated:** Based on current codebase analysis  
**API Count:** 10 portfolio endpoints  
**Python Scripts:** 5 scripts for gift data  
**Cache Strategy:** Multi-layer with fallbacks

