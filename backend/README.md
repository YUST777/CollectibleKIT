# Bot Directory Structure

## Organization

All Python code is organized into logical modules:

### `/core/` - Core Bot Functionality
- `telegram_bot.py` - Main bot entry point
- `database.py` - Database operations
- `config.py` - Configuration
- `processing.py` - Message processing
- `payment.py` - Payment handling
- `ton_wallet.py` - TON wallet integration
- `ton_wallet_cli.py` - Wallet CLI
- `transaction_tracker.py` - Transaction tracking

### `/services/` - External Services & APIs
- `get_profile_gifts.py` - Portfolio gift fetching
- `get_account_gifts.py` - Account gifts
- `get_channel_gifts.py` - Channel gifts
- `get_sticker_profile.py` - Sticker profiles
- `portal_market_api.py` - Portal Market API wrapper
- `portal_market_multi_account.py` - Multi-account support
- `get_gift_price.py` - Gift price fetching
- `get_portal_price.py` - Portal price fetching
- `get_unupgradeable_prices.py` - Unupgradeable gift prices
- `get_gift_metadata.py` - Gift metadata

### `/utils/` - Utility Functions
- `global_price_cache.py` - Global price caching
- `get_portfolio_cache.py` - Portfolio caching
- `address_utils.py` - Address utilities
- `decode_initdata.py` - Init data decoding
- `refresh_initdata.py` - Init data refresh
- `memo_system.py` - Memo system

### `/scripts/` - Standalone Scripts
- `create_portfolio_snapshot.py` - Daily snapshots
- `daily_withdrawal_tracker.py` - Withdrawal tracking
- `setup_portal_accounts.py` - Account setup
- `manage_user_premium.py` - Premium management
- `backup.py` - Backup script
- `start_bot.py` - Bot starter
- `start_mini_app.py` - Mini app starter
- `stop_bot.py` - Bot stopper
- `check_bot_status.py` - Status checker

### `/tests/` - Test Files
- All test_*.py files

### `/legacy/` - Legacy Code
- Old/unused code preserved for reference

## Usage

### Running Scripts

```bash
# From project root
python3 bot/services/get_profile_gifts.py @username
python3 bot/scripts/create_portfolio_snapshot.py --all-users
python3 bot/core/telegram_bot.py
```

### Imports

All modules should use relative imports or add bot root to sys.path:

```python
import sys
import os
bot_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, bot_root)

from services.portal_market_api import PortalMarketAPI
from utils.get_portfolio_cache import get_cached_portfolio
```
