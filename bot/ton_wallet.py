"""
TON Wallet Service for sending TON transactions
Uses pytoniq library for blockchain interactions
"""

import os
import asyncio
import logging
from typing import Optional
from pytoniq import LiteBalancer, WalletV4R2

logger = logging.getLogger(__name__)

# Bot's wallet configuration (should be stored securely)
# For now, these should be set as environment variables
WALLET_MNEMONIC = os.getenv('TON_WALLET_MNEMONIC', '')
WALLET_VERSION = WalletV4R2  # Using WalletV4R2 (most common)

class TONWalletService:
    """Service for sending TON to user wallets"""
    
    def __init__(self, mnemonic: str = None):
        """
        Initialize TON wallet service
        
        Args:
            mnemonic: 24-word mnemonic phrase for the bot's wallet
        """
        self.mnemonic = mnemonic or WALLET_MNEMONIC
        if not self.mnemonic:
            logger.warning("⚠️ TON wallet mnemonic not set! Withdrawals will not work.")
        
        self.wallet = None
        self.client = None
        
    async def initialize(self):
        """Initialize the wallet and connect to TON network"""
        try:
            if not self.mnemonic:
                logger.error("Cannot initialize wallet: No mnemonic provided")
                return False
            
            # Connect to TON network (mainnet)
            self.client = LiteBalancer.from_mainnet_config(trust_level=2)
            await self.client.start_up()
            
            # Initialize wallet from mnemonic
            mnemonics = self.mnemonic.split()
            self.wallet = await WALLET_VERSION.from_mnemonic(
                provider=self.client,
                mnemonics=mnemonics
            )
            
            # Get wallet address
            wallet_address = self.wallet.address.to_str(is_bounceable=True, is_url_safe=True)
            logger.info(f"✅ TON Wallet initialized: {wallet_address}")
            
            # Check balance
            balance = await self.get_balance()
            logger.info(f"💰 Current wallet balance: {balance} TON")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize TON wallet: {str(e)}")
            return False
    
    async def get_balance(self) -> float:
        """Get current wallet balance in TON"""
        try:
            if not self.wallet:
                return 0.0
            
            balance = await self.wallet.get_balance()
            # Convert from nanotons to TON
            return balance / 1_000_000_000
            
        except Exception as e:
            logger.error(f"Error getting wallet balance: {str(e)}")
            return 0.0
    
    async def send_ton(self, destination_address: str, amount_ton: float, comment: str = "") -> Optional[str]:
        """
        Send TON to a destination address
        
        Args:
            destination_address: Recipient's TON wallet address (user-friendly or raw format)
            amount_ton: Amount in TON to send
            comment: Optional comment/memo for the transaction
            
        Returns:
            Transaction hash if successful, None otherwise
        """
        try:
            if not self.wallet or not self.client:
                logger.error("Wallet not initialized")
                return None
            
            # Convert TON to nanotons
            amount_nanoton = int(amount_ton * 1_000_000_000)
            
            logger.info(f"📤 Sending {amount_ton} TON to {destination_address}")
            
            # Convert address to Address object if it's a string
            from pytoniq_core import Address
            
            # Handle both raw (0:...) and user-friendly formats
            if destination_address.startswith('0:') or destination_address.startswith('-1:'):
                # Raw format
                recipient = Address(destination_address)
            else:
                # User-friendly format (UQ..., EQ...)
                recipient = Address(destination_address)
            
            # Create and send transaction
            result = await self.wallet.transfer(
                destination=recipient,
                amount=amount_nanoton,
                body=comment  # Optional comment
            )
            
            # Get transaction hash
            tx_hash = result.hash.hex()
            logger.info(f"✅ Transaction sent! Hash: {tx_hash}")
            
            # Wait a bit for transaction to be processed
            await asyncio.sleep(2)
            
            return tx_hash
            
        except Exception as e:
            logger.error(f"❌ Error sending TON: {str(e)}")
            logger.exception(e)
            return None
    
    async def close(self):
        """Close connection to TON network"""
        try:
            if self.client:
                await self.client.close_all()
                logger.info("TON client closed")
        except Exception as e:
            logger.error(f"Error closing TON client: {str(e)}")


# Global instance
_wallet_service: Optional[TONWalletService] = None

def get_wallet_service() -> TONWalletService:
    """Get or create global wallet service instance"""
    global _wallet_service
    if _wallet_service is None:
        _wallet_service = TONWalletService()
    return _wallet_service

async def send_withdrawal(user_wallet_address: str, amount_ton: float, user_id: int) -> Optional[str]:
    """
    Helper function to send TON withdrawal to user
    
    Args:
        user_wallet_address: User's TON wallet address
        amount_ton: Amount to send in TON
        user_id: Telegram user ID (for logging/comment)
        
    Returns:
        Transaction hash if successful, None otherwise
    """
    wallet_service = get_wallet_service()
    
    # Initialize if not already done
    if not wallet_service.wallet:
        success = await wallet_service.initialize()
        if not success:
            return None
    
    # Send the transaction
    comment = f"Withdrawal for user {user_id}"
    tx_hash = await wallet_service.send_ton(
        destination_address=user_wallet_address,
        amount_ton=amount_ton,
        comment=comment
    )
    
    return tx_hash

