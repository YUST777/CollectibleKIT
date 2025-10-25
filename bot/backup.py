"""
Database Backup Module for CollectibleKIT Bot
Handles automatic database backups with compression and Telegram delivery.
"""

import asyncio
import os
import sqlite3
import tempfile
import time
import zipfile
from datetime import datetime
from typing import Optional
import logging

from telegram import Bot, InputFile
from telegram.error import TelegramError

logger = logging.getLogger(__name__)

class DatabaseBackup:
    def __init__(self, db_path: str, bot_token: str, backup_chat_id: int = -4944651195):
        """
        Initialize database backup system
        
        Args:
            db_path: Path to the SQLite database file
            bot_token: Telegram bot token for sending backups
            backup_chat_id: Chat ID to send backups to (default: -4944651195)
        """
        self.db_path = db_path
        self.bot_token = bot_token
        self.backup_chat_id = backup_chat_id
        self.bot = None
        self._backup_running = False
        
    async def initialize_bot(self):
        """Initialize the Telegram bot for sending backups"""
        if not self.bot:
            self.bot = Bot(token=self.bot_token)
            logger.info("Backup bot initialized")
    
    def create_backup(self) -> Optional[str]:
        """
        Create a compressed backup of the database
        
        Returns:
            Path to the backup file, or None if failed
        """
        try:
            if not os.path.exists(self.db_path):
                logger.error(f"Database file not found: {self.db_path}")
                return None
            
            # Create timestamp for backup filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"collectiblekit_backup_{timestamp}.zip"
            
            # Create temporary directory for backup
            with tempfile.TemporaryDirectory() as temp_dir:
                backup_path = os.path.join(temp_dir, backup_filename)
                
                # Create ZIP file with database
                with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    # Add the main database file
                    zipf.write(self.db_path, os.path.basename(self.db_path))
                    
                    # Add database schema dump
                    schema_dump = self._dump_schema()
                    if schema_dump:
                        zipf.writestr("schema.sql", schema_dump)
                    
                    # Add backup metadata
                    metadata = self._create_metadata()
                    zipf.writestr("backup_info.txt", metadata)
                
                # Copy backup to a persistent location
                persistent_backup_path = os.path.join(
                    os.path.dirname(self.db_path), 
                    f"backups/{backup_filename}"
                )
                
                # Ensure backups directory exists
                os.makedirs(os.path.dirname(persistent_backup_path), exist_ok=True)
                
                # Copy the backup file
                import shutil
                shutil.copy2(backup_path, persistent_backup_path)
                
                logger.info(f"Database backup created: {persistent_backup_path}")
                return persistent_backup_path
                
        except Exception as e:
            logger.error(f"Failed to create database backup: {e}")
            return None
    
    def _dump_schema(self) -> str:
        """Dump database schema to SQL"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get all table schemas
                cursor.execute("SELECT sql FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                
                schema_sql = "-- CollectibleKIT Database Schema\n"
                schema_sql += f"-- Generated: {datetime.now().isoformat()}\n\n"
                
                for table in tables:
                    if table[0]:  # Skip None entries
                        schema_sql += table[0] + ";\n\n"
                
                return schema_sql
                
        except Exception as e:
            logger.error(f"Failed to dump schema: {e}")
            return ""
    
    def _create_metadata(self) -> str:
        """Create backup metadata"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get table row counts
                tables_info = {}
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                
                for table in tables:
                    table_name = table[0]
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    tables_info[table_name] = count
                
                # Get database file size
                db_size = os.path.getsize(self.db_path)
                
                metadata = f"""CollectibleKIT Database Backup
Generated: {datetime.now().isoformat()}
Database Size: {db_size:,} bytes
Database Path: {self.db_path}

Table Statistics:
"""
                for table, count in tables_info.items():
                    metadata += f"  {table}: {count:,} rows\n"
                
                return metadata
                
        except Exception as e:
            logger.error(f"Failed to create metadata: {e}")
            return f"Backup created: {datetime.now().isoformat()}\nDatabase: {self.db_path}"
    
    async def send_backup(self, backup_path: str) -> bool:
        """
        Send backup file to the specified chat
        
        Args:
            backup_path: Path to the backup file
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            await self.initialize_bot()
            
            if not os.path.exists(backup_path):
                logger.error(f"Backup file not found: {backup_path}")
                return False
            
            # Get file size for logging
            file_size = os.path.getsize(backup_path)
            logger.info(f"Sending backup file: {backup_path} ({file_size:,} bytes)")
            
            # Create caption with backup info
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            caption = f"🗄️ **Database Backup**\n\n"
            caption += f"📅 **Time:** {timestamp}\n"
            caption += f"📊 **Size:** {file_size:,} bytes\n"
            caption += f"💾 **Database:** CollectibleKIT Bot\n\n"
            caption += f"Automatic hourly backup from bot instance."
            
            # Send the backup file
            with open(backup_path, 'rb') as backup_file:
                await self.bot.send_document(
                    chat_id=self.backup_chat_id,
                    document=InputFile(backup_file, filename=os.path.basename(backup_path)),
                    caption=caption,
                    parse_mode="Markdown"
                )
            
            logger.info(f"Backup sent successfully to chat {self.backup_chat_id}")
            return True
            
        except TelegramError as e:
            logger.error(f"Telegram error sending backup: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to send backup: {e}")
            return False
    
    async def perform_backup(self) -> bool:
        """
        Perform a complete backup: create and send
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("Starting database backup process...")
            
            # Create backup
            backup_path = self.create_backup()
            if not backup_path:
                logger.error("Failed to create backup")
                return False
            
            # Send backup
            success = await self.send_backup(backup_path)
            
            if success:
                logger.info("Database backup completed successfully")
                # Clean up old backups (keep last 24 hours worth)
                self._cleanup_old_backups()
            else:
                logger.error("Failed to send backup")
            
            return success
            
        except Exception as e:
            logger.error(f"Backup process failed: {e}")
            return False
    
    def _cleanup_old_backups(self):
        """Clean up backup files older than 24 hours"""
        try:
            backups_dir = os.path.join(os.path.dirname(self.db_path), "backups")
            if not os.path.exists(backups_dir):
                return
            
            current_time = time.time()
            cutoff_time = current_time - (24 * 60 * 60)  # 24 hours ago
            
            for filename in os.listdir(backups_dir):
                if filename.startswith("collectiblekit_backup_") and filename.endswith(".zip"):
                    file_path = os.path.join(backups_dir, filename)
                    file_time = os.path.getmtime(file_path)
                    
                    if file_time < cutoff_time:
                        os.remove(file_path)
                        logger.info(f"Cleaned up old backup: {filename}")
                        
        except Exception as e:
            logger.warning(f"Failed to cleanup old backups: {e}")
    
    async def start_hourly_backups(self):
        """Start the hourly backup scheduler"""
        if self._backup_running:
            logger.warning("Backup scheduler already running")
            return
        
        self._backup_running = True
        logger.info("Starting hourly backup scheduler...")
        
        try:
            while self._backup_running:
                # Perform backup
                await self.perform_backup()
                
                # Wait for 1 hour (3600 seconds)
                await asyncio.sleep(3600)
                
        except asyncio.CancelledError:
            logger.info("Backup scheduler cancelled")
        except Exception as e:
            logger.error(f"Backup scheduler error: {e}")
        finally:
            self._backup_running = False
    
    def stop_backups(self):
        """Stop the backup scheduler"""
        self._backup_running = False
        logger.info("Backup scheduler stopped")
    
    async def manual_backup(self) -> bool:
        """Perform a manual backup (for testing or on-demand)"""
        logger.info("Performing manual backup...")
        return await self.perform_backup()
