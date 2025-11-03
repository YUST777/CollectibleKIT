# Quantom 0.2 - Quick Start

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
cd quantom0.2
pip install -r requirements.txt
```

### 2. Setup (First Time Only)
```bash
python setup.py
```
Enter your phone number and verification code when prompted.

### 3. Run
```bash
python main.py
```

## 📊 What You Get

The API returns data from `https://quant-marketplace.com/api/gifts/gifts`:

- **134 gifts** with prices, supply, and metadata
- **80 backdrops**
- **689 symbols**

Results saved to `gifts_data.json`

## 💡 Usage Examples

### Basic Usage
```python
import asyncio
from auth import get_init_data
from api import QuantAPI

async def main():
    init_data = await get_init_data()
    api = QuantAPI(init_data)
    data = api.get_gifts()
    print(f"Total gifts: {len(data['gifts'])}")

asyncio.run(main())
```

### Filter Gifts
```python
# Get expensive gifts
expensive = [g for g in data['gifts'] if float(g['floor_price']) > 100]

# Get new gifts
new_gifts = [g for g in data['gifts'] if g['new']]

# Get by supply
rare = [g for g in data['gifts'] if g['supply'] < 5000]
```

## 📁 Project Structure

```
quantom0.2/
├── config.py          # Configuration
├── auth.py            # Telegram authentication
├── api.py             # API client
├── setup.py           # Session setup
├── main.py            # Main script
├── example.py         # Usage examples
└── gifts_data.json    # API response data
```

## ✅ Done!

Your clean Quant Marketplace API client is ready to use.
