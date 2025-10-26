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
        Create encrypted memo for withdrawal transaction
        
        Args:
            user_id: Telegram user ID
            amount_ton: Amount in TON
            transaction_type: Type of transaction
            
        Returns:
            Encrypted memo string
        """
        # Generate unique UUID for this transaction
        transaction_id = str(uuid.uuid4())
        
        # Create memo data
        memo_data = {
            "transaction_id": transaction_id,
            "user_id": user_id,
            "amount_ton": amount_ton,
            "type": transaction_type,
            "timestamp": int(uuid.uuid4().time_low),  # Simple timestamp
            "platform": "collectiblekit"
        }
        
        # Convert to JSON and encrypt
        json_data = json.dumps(memo_data)
        encrypted_data = self.cipher.encrypt(json_data.encode())
        
        # Encode to base64 for safe transmission
        memo = base64.urlsafe_b64encode(encrypted_data).decode()
        
        logger.info(f"Created withdrawal memo: {transaction_id} for user {user_id}")
        return memo
    
    def create_deposit_memo(self, user_id: int, amount_ton: float, transaction_type: str = "deposit") -> str:
        """
        Create encrypted memo for deposit transaction
        
        Args:
            user_id: Telegram user ID
            amount_ton: Amount in TON
            transaction_type: Type of transaction
            
        Returns:
            Encrypted memo string
        """
        return self.create_withdrawal_memo(user_id, amount_ton, transaction_type)
    
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
        Extract transaction ID from memo without full decryption
        
        Args:
            memo: Encrypted memo string
            
        Returns:
            Transaction ID or None if invalid
        """
        memo_data = self.decrypt_memo(memo)
        return memo_data.get('transaction_id') if memo_data else None
    
    def is_valid_memo(self, memo: str) -> bool:
        """
        Check if memo is valid and can be decrypted
        
        Args:
            memo: Encrypted memo string
            
        Returns:
            True if valid, False otherwise
        """
        return self.decrypt_memo(memo) is not None
    
    def get_memo_info(self, memo: str) -> Optional[Dict[str, Any]]:
        """
        Get readable info from memo
        
        Args:
            memo: Encrypted memo string
            
        Returns:
            Memo info dict or None if invalid
        """
        memo_data = self.decrypt_memo(memo)
        if not memo_data:
            return None
        
        return {
            "transaction_id": memo_data.get('transaction_id'),
            "user_id": memo_data.get('user_id'),
            "amount_ton": memo_data.get('amount_ton'),
            "type": memo_data.get('type'),
            "platform": memo_data.get('platform')
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
