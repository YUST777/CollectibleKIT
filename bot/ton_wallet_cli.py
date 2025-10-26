#!/usr/bin/env python3
"""
Command Line Interface for TON Wallet Operations
Used by the webapp to process withdrawals
"""

import asyncio
import argparse
import sys
import os
import json
from pathlib import Path

# Add the bot directory to the path
sys.path.append(str(Path(__file__).parent))

from ton_wallet import send_withdrawal, get_wallet_service
from address_utils import convert_to_friendly_address

async def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(description='TON Wallet CLI')
    parser.add_argument('--user-id', type=int, help='User ID for withdrawal')
    parser.add_argument('--amount', type=float, help='Amount in TON to withdraw')
    parser.add_argument('--wallet', type=str, help='Destination wallet address')
    parser.add_argument('--balance', action='store_true', help='Get wallet balance')
    
    args = parser.parse_args()
    
    # Load environment variables from the project root
    from dotenv import load_dotenv
    project_root = Path(__file__).parent.parent
    load_dotenv(project_root / '.env')
    
    try:
        if args.balance:
            # Get wallet balance
            mnemonic = os.getenv('TON_WALLET_MNEMONIC')
            if not mnemonic:
                print("ERROR: TON_WALLET_MNEMONIC not found in environment")
                sys.exit(1)
            
            # Remove quotes if present
            mnemonic = mnemonic.strip('"')
            
            from ton_wallet import TONWalletService
            wallet_service = TONWalletService(mnemonic)
            success = await wallet_service.initialize()
            
            if not success:
                print("ERROR: Failed to initialize wallet")
                sys.exit(1)
            
            balance = await wallet_service.get_balance()
            print(f"BALANCE: {balance}")
            sys.exit(0)
        
        elif args.user_id and args.amount and args.wallet:
            # Process withdrawal
            print(f"Processing withdrawal: User {args.user_id}, Amount {args.amount} TON, Wallet {args.wallet}")
            
            # Convert wallet address to friendly format if needed
            friendly_address = convert_to_friendly_address(args.wallet)
            if not friendly_address:
                print("ERROR: Invalid wallet address format")
                sys.exit(1)
            
            print(f"Converted address: {friendly_address}")
            
            # Get mnemonic from environment
            mnemonic = os.getenv('TON_WALLET_MNEMONIC')
            if not mnemonic:
                print("ERROR: TON_WALLET_MNEMONIC not found in environment")
                sys.exit(1)
            
            # Remove quotes if present
            mnemonic = mnemonic.strip('"')
            
            # Initialize wallet service with mnemonic
            from ton_wallet import TONWalletService
            wallet_service = TONWalletService(mnemonic)
            success = await wallet_service.initialize()
            
            if not success:
                print("ERROR: Failed to initialize wallet")
                sys.exit(1)
            
            # Send withdrawal using the wallet service directly
            from memo_system import get_memo_system
            from transaction_tracker import get_transaction_tracker
            
            memo_system = get_memo_system()
            tracker = get_transaction_tracker()
            
            # Create encrypted memo for tracking
            memo = memo_system.create_withdrawal_memo(args.user_id, args.amount)
            transaction_id = memo_system.extract_transaction_id(memo)
            
            # Record withdrawal in database
            tracker.record_withdrawal(args.user_id, args.amount, friendly_address, memo=memo)
            
            # Send the transaction with memo
            tx_hash = await wallet_service.send_ton(
                destination_address=friendly_address,
                amount_ton=args.amount,
                memo=memo
            )
            
            if tx_hash:
                # Update transaction status
                tracker.update_transaction_status(transaction_id, 'completed', tx_hash)
                print(f"SUCCESS: Withdrawal completed")
                print(f"TRANSACTION_HASH: {tx_hash}")
                sys.exit(0)
            else:
                # Mark as failed
                tracker.update_transaction_status(transaction_id, 'failed')
                print("ERROR: Withdrawal failed")
                sys.exit(1)
        
        else:
            print("ERROR: Missing required arguments")
            print("Usage: python ton_wallet_cli.py --user-id <id> --amount <amount> --wallet <address>")
            print("   or: python ton_wallet_cli.py --balance")
            sys.exit(1)
    
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
