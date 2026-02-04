"""
Transaction Tracker for TON Transactions
Tracks deposits and withdrawals with memo system
"""

import sqlite3
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from memo_system import get_memo_system

logger = logging.getLogger(__name__)

class TransactionTracker:
    """Tracks TON transactions with memo system"""
    
    def __init__(self, db_path: str = "bot_data.db"):
        """
        Initialize transaction tracker
        
        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path
        self.memo_system = get_memo_system()
        self._init_database()
    
    def _init_database(self):
        """Initialize database tables"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create transactions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS ton_transactions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        transaction_id TEXT UNIQUE NOT NULL,
                        user_id INTEGER NOT NULL,
                        amount_ton REAL NOT NULL,
                        transaction_type TEXT NOT NULL,
                        wallet_address TEXT NOT NULL,
                        tx_hash TEXT,
                        memo TEXT,
                        status TEXT DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create index for faster lookups
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_transaction_id 
                    ON ton_transactions(transaction_id)
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_id 
                    ON ton_transactions(user_id)
                """)
                
                conn.commit()
                logger.info("Transaction tracker database initialized")
                
        except Exception as e:
            logger.error(f"Failed to initialize transaction tracker database: {str(e)}")
    
    def record_withdrawal(self, user_id: int, amount_ton: float, wallet_address: str, 
                         tx_hash: str = None, memo: str = None) -> Optional[str]:
        """
        Record a withdrawal transaction
        
        Args:
            user_id: Telegram user ID
            amount_ton: Amount in TON
            wallet_address: User's wallet address
            tx_hash: Transaction hash (if available)
            memo: Encrypted memo (if available)
            
        Returns:
            Transaction ID or None if failed
        """
        try:
            # Create memo if not provided
            if not memo:
                memo = self.memo_system.create_withdrawal_memo(user_id, amount_ton)
            
            # Extract transaction ID from memo
            transaction_id = self.memo_system.extract_transaction_id(memo)
            if not transaction_id:
                logger.error("Failed to extract transaction ID from memo")
                return None
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT INTO ton_transactions 
                    (transaction_id, user_id, amount_ton, transaction_type, 
                     wallet_address, tx_hash, memo, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (transaction_id, user_id, amount_ton, 'withdrawal', 
                      wallet_address, tx_hash, memo, 'pending'))
                
                conn.commit()
                logger.info(f"Recorded withdrawal: {transaction_id} for user {user_id}")
                return transaction_id
                
        except sqlite3.IntegrityError:
            logger.warning(f"Transaction {transaction_id} already exists")
            return transaction_id
        except Exception as e:
            logger.error(f"Failed to record withdrawal: {str(e)}")
            return None
    
    def record_deposit(self, user_id: int, amount_ton: float, wallet_address: str, 
                      tx_hash: str = None, memo: str = None) -> Optional[str]:
        """
        Record a deposit transaction
        
        Args:
            user_id: Telegram user ID
            amount_ton: Amount in TON
            wallet_address: User's wallet address
            tx_hash: Transaction hash (if available)
            memo: Encrypted memo (if available)
            
        Returns:
            Transaction ID or None if failed
        """
        try:
            # Create memo if not provided
            if not memo:
                memo = self.memo_system.create_deposit_memo(user_id, amount_ton)
            
            # Extract transaction ID from memo
            transaction_id = self.memo_system.extract_transaction_id(memo)
            if not transaction_id:
                logger.error("Failed to extract transaction ID from memo")
                return None
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT INTO ton_transactions 
                    (transaction_id, user_id, amount_ton, transaction_type, 
                     wallet_address, tx_hash, memo, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (transaction_id, user_id, amount_ton, 'deposit', 
                      wallet_address, tx_hash, memo, 'pending'))
                
                conn.commit()
                logger.info(f"Recorded deposit: {transaction_id} for user {user_id}")
                return transaction_id
                
        except sqlite3.IntegrityError:
            logger.warning(f"Transaction {transaction_id} already exists")
            return transaction_id
        except Exception as e:
            logger.error(f"Failed to record deposit: {str(e)}")
            return None
    
    def update_transaction_status(self, transaction_id: str, status: str, tx_hash: str = None):
        """
        Update transaction status
        
        Args:
            transaction_id: Transaction ID
            status: New status (pending, completed, failed)
            tx_hash: Transaction hash (optional)
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if tx_hash:
                    cursor.execute("""
                        UPDATE ton_transactions 
                        SET status = ?, tx_hash = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE transaction_id = ?
                    """, (status, tx_hash, transaction_id))
                else:
                    cursor.execute("""
                        UPDATE ton_transactions 
                        SET status = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE transaction_id = ?
                    """, (status, transaction_id))
                
                conn.commit()
                logger.info(f"Updated transaction {transaction_id} status to {status}")
                
        except Exception as e:
            logger.error(f"Failed to update transaction status: {str(e)}")
    
    def get_transaction(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """
        Get transaction by ID
        
        Args:
            transaction_id: Transaction ID
            
        Returns:
            Transaction data or None if not found
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT * FROM ton_transactions 
                    WHERE transaction_id = ?
                """, (transaction_id,))
                
                row = cursor.fetchone()
                if row:
                    columns = [description[0] for description in cursor.description]
                    return dict(zip(columns, row))
                return None
                
        except Exception as e:
            logger.error(f"Failed to get transaction: {str(e)}")
            return None
    
    def get_user_transactions(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get user's transactions
        
        Args:
            user_id: Telegram user ID
            limit: Maximum number of transactions to return
            
        Returns:
            List of transaction data
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT * FROM ton_transactions 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT ?
                """, (user_id, limit))
                
                rows = cursor.fetchall()
                columns = [description[0] for description in cursor.description]
                return [dict(zip(columns, row)) for row in rows]
                
        except Exception as e:
            logger.error(f"Failed to get user transactions: {str(e)}")
            return []
    
    def is_transaction_processed(self, transaction_id: str) -> bool:
        """
        Check if transaction has been processed
        
        Args:
            transaction_id: Transaction ID
            
        Returns:
            True if processed, False otherwise
        """
        transaction = self.get_transaction(transaction_id)
        return transaction is not None and transaction['status'] in ['completed', 'failed']
    
    def get_pending_transactions(self) -> List[Dict[str, Any]]:
        """
        Get all pending transactions
        
        Returns:
            List of pending transaction data
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT * FROM ton_transactions 
                    WHERE status = 'pending' 
                    ORDER BY created_at ASC
                """)
                
                rows = cursor.fetchall()
                columns = [description[0] for description in cursor.description]
                return [dict(zip(columns, row)) for row in rows]
                
        except Exception as e:
            logger.error(f"Failed to get pending transactions: {str(e)}")
            return []

# Global instance
_tracker: Optional[TransactionTracker] = None

def get_transaction_tracker() -> TransactionTracker:
    """Get or create global transaction tracker instance"""
    global _tracker
    if _tracker is None:
        _tracker = TransactionTracker()
    return _tracker
