"""
Memo System for TON Transactions
Encrypts/decrypts transaction memos with UUIDs for tracking
"""

import uuid
import base64
import json
import logging
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os

logger = logging.getLogger(__name__)

class MemoSystem:
    """System for encrypting/decrypting transaction memos with UUIDs"""
    
    def __init__(self, secret_key: str = None):
        """
        Initialize memo system with encryption key
        
        Args:
            secret_key: Secret key for encryption (defaults to env var)
        """
        self.secret_key = secret_key or os.getenv('MEMO_SECRET_KEY', 'collectiblekit_memo_secret_2024')
        self.cipher = self._create_cipher()
    
    def _create_cipher(self) -> Fernet:
        """Create Fernet cipher from secret key"""
        # Derive key from secret using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'collectiblekit_salt',
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.secret_key.encode()))
        return Fernet(key)
    
    def create_withdrawal_memo(self, user_id: int, amount_ton: float, transaction_type: str = "withdrawal") -> str:
        """
        Create short memo for withdrawal transaction (max 16 chars)
        
        Args:
            user_id: Telegram user ID
            amount_ton: Amount in TON
            transaction_type: Type of transaction
            
        Returns:
            Short memo string (16 chars max)
        """
        # Generate unique short ID (8 chars)
        short_id = str(uuid.uuid4()).replace('-', '')[:8]
        
        # Create short memo: W + short_id + last 2 digits of user_id
        # Format: W12345678 (W for withdrawal, 8 char ID)
        memo = f"W{short_id}"
        
        # Store full data in database separately
        self._store_memo_data(short_id, user_id, amount_ton, transaction_type)
        
        logger.info(f"Created short withdrawal memo: {memo} for user {user_id}")
        return memo
    
    def create_deposit_memo(self, user_id: int, amount_ton: float, transaction_type: str = "deposit") -> str:
        """
        Create short memo for deposit transaction (max 16 chars)
        
        Args:
            user_id: Telegram user ID
            amount_ton: Amount in TON
            transaction_type: Type of transaction
            
        Returns:
            Short memo string (16 chars max)
        """
        # Generate unique short ID (8 chars)
        short_id = str(uuid.uuid4()).replace('-', '')[:8]
        
        # Create short memo: D + short_id
        # Format: D12345678 (D for deposit, 8 char ID)
        memo = f"D{short_id}"
        
        # Store full data in database separately
        self._store_memo_data(short_id, user_id, amount_ton, transaction_type)
        
        logger.info(f"Created short deposit memo: {memo} for user {user_id}")
        return memo
    
    def _store_memo_data(self, short_id: str, user_id: int, amount_ton: float, transaction_type: str):
        """Store memo data in database for later retrieval"""
        try:
            import sqlite3
            with sqlite3.connect("bot_data.db") as conn:
                cursor = conn.cursor()
                
                # Create memo_data table if not exists
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS memo_data (
                        short_id TEXT PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        amount_ton REAL NOT NULL,
                        transaction_type TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Insert memo data
                cursor.execute("""
                    INSERT OR REPLACE INTO memo_data 
                    (short_id, user_id, amount_ton, transaction_type)
                    VALUES (?, ?, ?, ?)
                """, (short_id, user_id, amount_ton, transaction_type))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to store memo data: {str(e)}")
    
    def get_memo_data(self, short_id: str) -> Optional[Dict[str, Any]]:
        """Get memo data by short ID"""
        try:
            import sqlite3
            with sqlite3.connect("bot_data.db") as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT * FROM memo_data WHERE short_id = ?
                """, (short_id,))
                
                row = cursor.fetchone()
                if row:
                    return {
                        "short_id": row[0],
                        "user_id": row[1],
                        "amount_ton": row[2],
                        "transaction_type": row[3],
                        "created_at": row[4]
                    }
                return None
                
        except Exception as e:
            logger.error(f"Failed to get memo data: {str(e)}")
            return None
    
    def decrypt_memo(self, encrypted_memo: str) -> Optional[Dict[str, Any]]:
        """
        Decrypt and parse memo data
        
        Args:
            encrypted_memo: Encrypted memo string
            
        Returns:
            Decrypted memo data or None if invalid
        """
        try:
            # Decode from base64
            encrypted_data = base64.urlsafe_b64decode(encrypted_memo.encode())
            
            # Decrypt
            decrypted_data = self.cipher.decrypt(encrypted_data)
            
            # Parse JSON
            memo_data = json.loads(decrypted_data.decode())
            
            logger.info(f"Decrypted memo: {memo_data.get('transaction_id', 'unknown')}")
            return memo_data
            
        except Exception as e:
            logger.error(f"Failed to decrypt memo: {str(e)}")
            return None
    
    def extract_transaction_id(self, memo: str) -> Optional[str]:
        """
        Extract transaction ID from short memo
        
        Args:
            memo: Short memo string (e.g., W12345678)
            
        Returns:
            Short ID or None if invalid
        """
        if len(memo) == 9 and memo[0] in ['W', 'D']:
            return memo[1:]  # Return the 8-char ID part
        return None
    
    def is_valid_memo(self, memo: str) -> bool:
        """
        Check if memo is valid short format
        
        Args:
            memo: Short memo string
            
        Returns:
            True if valid, False otherwise
        """
        return len(memo) == 9 and memo[0] in ['W', 'D'] and memo[1:].isalnum()
    
    def get_memo_info(self, memo: str) -> Optional[Dict[str, Any]]:
        """
        Get readable info from short memo
        
        Args:
            memo: Short memo string (e.g., W12345678)
            
        Returns:
            Memo info dict or None if invalid
        """
        short_id = self.extract_transaction_id(memo)
        if not short_id:
            return None
        
        memo_data = self.get_memo_data(short_id)
        if not memo_data:
            return None
        
        return {
            "short_id": memo_data.get('short_id'),
            "user_id": memo_data.get('user_id'),
            "amount_ton": memo_data.get('amount_ton'),
            "type": memo_data.get('transaction_type'),
            "memo_type": memo[0]  # W or D
        }

# Global instance
_memo_system: Optional[MemoSystem] = None

def get_memo_system() -> MemoSystem:
    """Get or create global memo system instance"""
    global _memo_system
    if _memo_system is None:
        _memo_system = MemoSystem()
    return _memo_system

# Helper functions
def create_withdrawal_memo(user_id: int, amount_ton: float) -> str:
    """Create withdrawal memo"""
    return get_memo_system().create_withdrawal_memo(user_id, amount_ton)

def create_deposit_memo(user_id: int, amount_ton: float) -> str:
    """Create deposit memo"""
    return get_memo_system().create_deposit_memo(user_id, amount_ton)

def decrypt_memo(memo: str) -> Optional[Dict[str, Any]]:
    """Decrypt memo"""
    return get_memo_system().decrypt_memo(memo)

def is_valid_memo(memo: str) -> bool:
    """Check if memo is valid"""
    return get_memo_system().is_valid_memo(memo)
