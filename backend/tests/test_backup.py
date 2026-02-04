#!/usr/bin/env python3
"""
Test script for the database backup system
"""

import asyncio
import os
import sys
import logging

# Add the bot directory to the path
sys.path.append(os.path.dirname(__file__))

from backup import DatabaseBackup
import sys
import os
bot_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, bot_root)
from core.config import BOT_TOKEN

# Configure logging
logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("backup-test")

async def test_backup():
    """Test the backup system"""
    try:
        # Initialize backup system
        backup_system = DatabaseBackup(
            db_path="bot_data.db",  # Use relative path for testing
            bot_token=BOT_TOKEN,
            backup_chat_id=-4944651195
        )
        
        logger.info("Testing database backup system...")
        
        # Test manual backup
        success = await backup_system.manual_backup()
        
        if success:
            logger.info("✅ Backup test completed successfully!")
        else:
            logger.error("❌ Backup test failed!")
            
    except Exception as e:
        logger.error(f"Backup test error: {e}")

if __name__ == "__main__":
    asyncio.run(test_backup())
