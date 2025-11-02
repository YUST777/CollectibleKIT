# NFT Fragment Downloader

This Python script downloads and stores NFT collection data from Fragment (https://nft.fragment.com/) and Telegram (https://t.me/nft). It fetches item metadata, including names, descriptions, images, attributes, and Lottie animations, and stores them in SQLite databases. The script supports concurrent downloads, rate limiting handling, and fallback scraping from Telegram when items are not available on Fragment.

## Features
- Downloads NFT metadata from Fragment and Telegram.
- Stores data in SQLite databases with separate tables for items and metadata.
- Handles rate limiting with exponential backoff retries.
- Supports concurrent HTTP requests with configurable limits.
- Logs detailed progress and errors to both console and file (`download_log.log`).
- Tracks statistics for items sourced from Blockchain (Fragment) and Telegram.
- Processes collections in batches for efficient database operations.
- Uses colored terminal output for better readability.

## Prerequisites
- Python 3.8 or higher
- Required Python packages (see `requirements.txt`)

## Installation
1. Clone or download this repository.
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Ensure you have an active internet connection to fetch data from Fragment and Telegram.

## Usage
1. Modify the `gifts` list in the script to specify the NFT collections to download. Each entry should include:
   - `name`: The gift/collection name (e.g., "durovscap").
   - `total_items`: The total number of items in the collection (e.g., 30).
   Example:
   ```python
   gifts = [
       {"name": "durovscap", "total_items": 30},
       {"name": "signetring", "total_items": 10},
   ]
   ```
2. Run the script:
   ```bash
   python script.py
   ```
3. The script will:
   - Create a directory `exports/db/` to store SQLite databases.
   - Download metadata for each gift and store it in a separate `.db` file (e.g., `durovscap.db`).
   - Log progress and errors to `download_log.log` and the console.
   - Display a summary report with the number of items sourced from Blockchain and Telegram.

## Configuration
The script includes several configurable parameters at the top:
- `DB_DIR`: Directory for SQLite database files (`exports/db`).
- `FRAGMENT_URL`: Base URL for Fragment NFT data (`https://nft.fragment.com/gift`).
- `TELEGRAM_URL`: Base URL for Telegram NFT pages (`https://t.me/nft`).
- `RETRIES`: Number of retry attempts for failed HTTP requests (default: 5).
- `INITIAL_RETRY_DELAY`: Initial delay for retries in milliseconds (default: 1000).
- `BATCH_SIZE`: Number of items to process per batch (default: 5).
- `MAX_CONCURRENT_REQUESTS`: Maximum concurrent HTTP requests per gift (default: 10).

## Database Schema
Each SQLite database contains two tables:
- `items`:
  - `id` (INTEGER, PRIMARY KEY): Item ID.
  - `name` (TEXT): Item name.
  - `description` (TEXT): Item description.
  - `image` (TEXT): URL to the item image.
  - `attributes` (TEXT): JSON string of item attributes.
  - `lottie` (TEXT): URL to the Lottie animation.
  - `isOnTelegram` (INTEGER): 1 if sourced from Telegram, 0 otherwise.
  - `isOnBlockchain` (INTEGER): 1 if sourced from Fragment, 0 otherwise.
- `metadata`:
  - `key` (TEXT, PRIMARY KEY): Metadata key (e.g., `lastFetchedItem`).
  - `value` (TEXT): Metadata value.

## Logging
- Logs are saved to `download_log.log` and printed to the console.
- Log levels include INFO, WARNING, and ERROR.
- Colored output is used in the console for better readability (via `colorama`).

## Error Handling
- Handles HTTP errors (e.g., 404, 429) with retries and fallback to Telegram scraping.
- Logs exceptions during scraping, database operations, or HTTP requests.
- Ensures database connections are properly closed.

## Dependencies
See `requirements.txt` for the list of required Python packages.

## License
This project is licensed under the MIT License.