# 🎁 Gift Collection Data Reference

## Quick Access URLs

```
Gift Models:  https://cdn.changes.tg/gifts/id-to-name.json
Backdrops:    https://cdn.changes.tg/gifts/backdrops.json
Model Assets: https://cdn.changes.tg/gifts/models/{name}/model.tgs
Patterns:     https://cdn.changes.tg/gifts/backdrops/{name}/
```

## Data Structures

### 1. Gift Models (`id-to-name.json`)

**Format**: Object with ID → Name mapping

```json
{
  "1": "Delicious Cake",
  "2": "Blue Star",
  "3": "Green Star",
  "4": "Red Star",
  "5": "Pink Star",
  ...
  "100": "Magic Wand"
}
```

**Converted to Array** (in JavaScript):
```javascript
[
  { id: 1, name: "Delicious Cake" },
  { id: 2, name: "Blue Star" },
  { id: 3, name: "Green Star" },
  ...
]
```

### 2. Backdrops (`backdrops.json`)

**Format**: Array of backdrop objects

```json
[
  {
    "name": "Satin Gold",
    "centerColor": 12557127,
    "edgeColor": 9271097,
    "patternColor": 6109952,
    "textColor": 16704681,
    "rarityPermille": 10,
    "hex": {
      "centerColor": "#bf9b47",
      "edgeColor": "#8d7739",
      "patternColor": "#5d3b00",
      "textColor": "#fee4a9"
    }
  },
  {
    "name": "Rose Gold",
    "centerColor": 13938117,
    "edgeColor": 11820075,
    "patternColor": 9114949,
    "textColor": 16770764,
    "rarityPermille": 15,
    "hex": {
      "centerColor": "#d4a5a5",
      "edgeColor": "#b48b8b",
      "patternColor": "#8b2f45",
      "textColor": "#ffc1cc"
    }
  }
]
```

### 3. User Design Storage (In-Memory)

```javascript
giftData.userDesigns = {
  1: {
    modelId: 1,
    modelName: "Delicious Cake",
    backdropIndex: 0,
    backdropName: "Satin Gold",
    backdropHex: {
      centerColor: "#bf9b47",
      edgeColor: "#8d7739",
      patternColor: "#5d3b00",
      textColor: "#fee4a9"
    }
  },
  2: {
    modelId: 2,
    modelName: "Blue Star",
    backdropIndex: 3,
    backdropName: "Rose Gold",
    backdropHex: { ... }
  },
  // ... up to 6 slots
}
```

## Backdrop Properties Explained

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `name` | string | Display name of backdrop | "Satin Gold" |
| `centerColor` | integer | Center gradient color (decimal) | 12557127 |
| `edgeColor` | integer | Edge gradient color (decimal) | 9271097 |
| `patternColor` | integer | Overlay pattern color (decimal) | 6109952 |
| `textColor` | integer | Optimal text color (decimal) | 16704681 |
| `rarityPermille` | integer | Rarity in permille (0.1%) | 10 = 1.0% |
| `hex.centerColor` | string | Center color in hex | "#bf9b47" |
| `hex.edgeColor` | string | Edge color in hex | "#8d7739" |
| `hex.patternColor` | string | Pattern color in hex | "#5d3b00" |
| `hex.textColor` | string | Text color in hex | "#fee4a9" |

## Color Conversion

### Decimal to Hex
```javascript
// Example: 12557127 → "#BF9B47"
function decimalToHex(decimal) {
    return '#' + decimal.toString(16).padStart(6, '0').toUpperCase();
}

console.log(decimalToHex(12557127)); // "#BF9B47"
```

### Hex to Decimal
```javascript
// Example: "#BF9B47" → 12557127
function hexToDecimal(hex) {
    return parseInt(hex.replace('#', ''), 16);
}

console.log(hexToDecimal("#BF9B47")); // 12557127
```

## Rarity Calculation

```javascript
// rarityPermille is in 0.1% units (permille)
// Example: rarityPermille: 10 = 1.0%

function getRarityPercent(rarityPermille) {
    return (rarityPermille / 10).toFixed(1) + '%';
}

console.log(getRarityPercent(10));  // "1.0%"
console.log(getRarityPercent(50));  // "5.0%"
console.log(getRarityPercent(100)); // "10.0%"
```

## Sample Backdrop Colors

### Ultra Rare (< 1%)
```javascript
[
  { name: "Platinum", rarity: 0.5%, hex: "#E5E4E2" },
  { name: "Diamond", rarity: 0.8%, hex: "#B9F2FF" },
  { name: "Black Opal", rarity: 0.3%, hex: "#0A0A0A" }
]
```

### Rare (1-5%)
```javascript
[
  { name: "Satin Gold", rarity: 1.0%, hex: "#BF9B47" },
  { name: "Rose Gold", rarity: 1.5%, hex: "#D4A5A5" },
  { name: "Emerald", rarity: 2.0%, hex: "#50C878" },
  { name: "Sapphire", rarity: 3.0%, hex: "#0F52BA" },
  { name: "Ruby", rarity: 4.0%, hex: "#E0115F" }
]
```

### Common (5-10%)
```javascript
[
  { name: "Blue Sky", rarity: 5.0%, hex: "#4A90E2" },
  { name: "Pink Dream", rarity: 6.0%, hex: "#FF69B4" },
  { name: "Green Mint", rarity: 7.0%, hex: "#98D8C8" },
  { name: "Orange Sunset", rarity: 8.0%, hex: "#FF6B35" },
  { name: "Purple Haze", rarity: 9.0%, hex: "#6A0572" }
]
```

## Sample Gift Names (Sorted A-Z)

```
Apple Pie
Berry Box
Blue Star
Bunny Muffin
Candy Cane
Chocolate Bar
Christmas Tree
Coffee Cup
Crystal Ball
Delicious Cake
Diamond
Donut
Dragon Scale
Easter Egg
Fairy Dust
Fire Crystal
Fireworks
Flying Broom
Ghost Spirit
Ginger Cookie
Golden Crown
Green Star
Halloween Pumpkin
Heart Locket
Magic Wand
Moon Pendant
Party Confetti
Pink Star
Pizza Slice
Red Star
Sakura Flower
Silver Coin
Strawberry
Sun Token
Unicorn Horn
Valentine Rose
...
(100+ total)
```

## JavaScript Access Examples

### Get All Gift Names
```javascript
const giftNames = giftData.models.map(m => m.name);
console.log(giftNames); // ["Apple Pie", "Berry Box", ...]
```

### Find Gift by Name
```javascript
const gift = giftData.models.find(m => m.name === "Delicious Cake");
console.log(gift); // { id: 1, name: "Delicious Cake" }
```

### Get All Rare Backdrops (< 5%)
```javascript
const rareBackdrops = giftData.backdrops.filter(b => b.rarityPermille < 50);
console.log(rareBackdrops.map(b => b.name));
// ["Satin Gold", "Rose Gold", "Emerald", "Sapphire", "Ruby"]
```

### Get Backdrop by Name
```javascript
const backdrop = giftData.backdrops.find(b => b.name === "Satin Gold");
console.log(backdrop.hex.centerColor); // "#bf9b47"
```

### Sort Backdrops by Rarity (Rarest First)
```javascript
const sortedByRarity = [...giftData.backdrops].sort((a, b) => 
    a.rarityPermille - b.rarityPermille
);
console.log(sortedByRarity[0]); // Rarest backdrop
```

### Get Random Gift + Backdrop Combo
```javascript
function getRandomCombo() {
    const randomGift = giftData.models[
        Math.floor(Math.random() * giftData.models.length)
    ];
    const randomBackdrop = giftData.backdrops[
        Math.floor(Math.random() * giftData.backdrops.length)
    ];
    return { gift: randomGift, backdrop: randomBackdrop };
}

const combo = getRandomCombo();
console.log(`${combo.gift.name} with ${combo.backdrop.name}`);
```

## Canvas Drawing Snippets

### Draw Radial Gradient Background
```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const backdrop = giftData.backdrops[0]; // Satin Gold

const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,      // Center point
    canvas.width / 2, canvas.height / 2, canvas.width / 2  // Outer radius
);
gradient.addColorStop(0, backdrop.hex.centerColor); // Center color
gradient.addColorStop(1, backdrop.hex.edgeColor);   // Edge color

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

### Draw Pattern Overlay
```javascript
if (backdrop.hex.patternColor !== backdrop.hex.centerColor) {
    ctx.fillStyle = backdrop.hex.patternColor;
    ctx.globalAlpha = 0.1; // 10% opacity
    
    // Draw dot pattern
    for (let x = 0; x < canvas.width; x += 20) {
        for (let y = 0; y < canvas.height; y += 20) {
            ctx.fillRect(x, y, 10, 10);
        }
    }
    
    ctx.globalAlpha = 1.0; // Reset opacity
}
```

### Draw Gift Name with Optimal Color
```javascript
ctx.font = 'bold 20px Arial';
ctx.fillStyle = backdrop.hex.textColor; // Auto-contrast color
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(gift.name, canvas.width / 2, canvas.height / 2);
```

### Draw Rarity Indicator
```javascript
const rarityPercent = (backdrop.rarityPermille / 10).toFixed(1);
ctx.font = '14px Arial';
ctx.fillStyle = backdrop.hex.textColor;
ctx.fillText(`${rarityPercent}% Rarity`, canvas.width / 2, canvas.height / 2 + 30);
```

## Local Storage Integration (Optional)

### Save Designs to Local Storage
```javascript
function saveDesignsToStorage() {
    localStorage.setItem('giftDesigns', JSON.stringify(giftData.userDesigns));
    console.log('✅ Designs saved to localStorage');
}
```

### Load Designs from Local Storage
```javascript
function loadDesignsFromStorage() {
    const saved = localStorage.getItem('giftDesigns');
    if (saved) {
        giftData.userDesigns = JSON.parse(saved);
        console.log('✅ Designs loaded from localStorage');
        
        // Re-render all saved slots
        for (let slot = 1; slot <= 6; slot++) {
            if (giftData.userDesigns[slot]) {
                updateSlotPreview(slot);
            }
        }
    }
}
```

### Clear Saved Designs
```javascript
function clearAllDesigns() {
    if (confirm('Clear all designs? This cannot be undone.')) {
        giftData.userDesigns = {};
        localStorage.removeItem('giftDesigns');
        
        // Reset all slots to empty state
        for (let slot = 1; slot <= 6; slot++) {
            const card = document.querySelector(`.gift-slot[data-slot="${slot}"] .gift-preview-card`);
            if (card) {
                card.querySelector('.gift-preview-placeholder').style.display = 'flex';
                card.querySelector('.gift-preview-content').style.display = 'none';
            }
        }
        
        console.log('✅ All designs cleared');
    }
}
```

## Error Handling

### Check if Data Loaded
```javascript
if (giftData.models.length === 0 || giftData.backdrops.length === 0) {
    console.error('❌ Gift data not loaded!');
    await loadGiftCatalogData();
}
```

### Validate Gift Selection
```javascript
function validateSelection(modelId, backdropIndex) {
    if (!modelId || modelId === '') {
        throw new Error('No gift model selected');
    }
    
    if (backdropIndex === '' || backdropIndex < 0) {
        throw new Error('No backdrop selected');
    }
    
    const model = giftData.models.find(m => m.id == modelId);
    if (!model) {
        throw new Error('Invalid gift model ID');
    }
    
    const backdrop = giftData.backdrops[backdropIndex];
    if (!backdrop) {
        throw new Error('Invalid backdrop index');
    }
    
    return { model, backdrop };
}
```

### Retry Loading with Exponential Backoff
```javascript
async function loadWithRetry(url, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed:`, error.message);
            if (i === maxRetries - 1) throw error;
            
            // Exponential backoff: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
}
```

## Performance Optimization

### Lazy Load Gift Images (Future Enhancement)
```javascript
const imageCache = new Map();

async function loadGiftImage(giftName) {
    if (imageCache.has(giftName)) {
        return imageCache.get(giftName);
    }
    
    const img = new Image();
    img.src = `https://cdn.changes.tg/gifts/models/${encodeURIComponent(giftName)}/icon.png`;
    
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
    });
    
    imageCache.set(giftName, img);
    return img;
}
```

### Debounce Preview Updates
```javascript
let updateTimeout;

function debouncedUpdatePreview() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        updateGiftPreview();
    }, 300); // Wait 300ms after last change
}

// Use in onChange handlers
document.getElementById('gift-model-select').onchange = debouncedUpdatePreview;
document.getElementById('backdrop-select').onchange = debouncedUpdatePreview;
```

---

**Last Updated**: October 11, 2025  
**Data Source**: https://cdn.changes.tg/gifts/  
**Status**: ✅ Complete Reference




