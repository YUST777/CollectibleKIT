#!/usr/bin/env python3
"""
User Premium Management CLI
Manage user premium status and daily withdrawal limits
"""

import argparse
import sys
from pathlib import Path

# Add the bot directory to the path
sys.path.append(str(Path(__file__).parent))

from daily_withdrawal_tracker import get_daily_withdrawal_tracker

def main():
    """Main CLI function for managing user premium status"""
    parser = argparse.ArgumentParser(description='Manage user premium status')
    parser.add_argument('--user-id', type=int, required=True, help='User ID')
    parser.add_argument('--set-premium', action='store_true', help='Set user as premium')
    parser.add_argument('--set-free', action='store_true', help='Set user as free')
    parser.add_argument('--check-status', action='store_true', help='Check user status')
    parser.add_argument('--check-limits', action='store_true', help='Check daily withdrawal limits')
    parser.add_argument('--amount', type=float, help='Amount to check for withdrawal')
    parser.add_argument('--premium-until', type=str, help='Premium expiration date (YYYY-MM-DD)')
    
    args = parser.parse_args()
    
    tracker = get_daily_withdrawal_tracker()
    
    if args.set_premium:
        premium_until = args.premium_until
        tracker.set_user_premium_status(args.user_id, True, premium_until)
        print(f"✅ Set user {args.user_id} as PREMIUM")
        if premium_until:
            print(f"   Premium until: {premium_until}")
        else:
            print("   Premium until: Forever")
    
    elif args.set_free:
        tracker.set_user_premium_status(args.user_id, False)
        print(f"✅ Set user {args.user_id} as FREE")
    
    elif args.check_status:
        is_premium = tracker.is_user_premium(args.user_id)
        status = "PREMIUM" if is_premium else "FREE"
        print(f"User {args.user_id} status: {status}")
        
        # Show limits
        if is_premium:
            print(f"   Daily limit: {tracker.limits.PREMIUM_MAX_DAILY} TON")
            print(f"   Min withdrawal: {tracker.limits.PREMIUM_MIN_WITHDRAWAL} TON")
        else:
            print(f"   Daily limit: {tracker.limits.FREE_MAX_DAILY} TON")
            print(f"   Min withdrawal: {tracker.limits.FREE_MIN_WITHDRAWAL} TON")
    
    elif args.check_limits:
        if not args.amount:
            print("ERROR: --amount is required for checking limits")
            sys.exit(1)
        
        withdrawal_check = tracker.can_withdraw(args.user_id, args.amount)
        
        print(f"Withdrawal check for user {args.user_id}:")
        print(f"   Requested amount: {args.amount} TON")
        print(f"   Can withdraw: {withdrawal_check['can_withdraw']}")
        print(f"   Reason: {withdrawal_check['reason']}")
        print(f"   User type: {'Premium' if withdrawal_check['is_premium'] else 'Free'}")
        print(f"   Daily limit: {withdrawal_check['max_daily']} TON")
        print(f"   Already withdrawn today: {withdrawal_check['daily_withdrawn']} TON")
        print(f"   Remaining today: {withdrawal_check['remaining_today']} TON")
        
        if 'adjusted_amount' in withdrawal_check:
            print(f"   Adjusted amount: {withdrawal_check['adjusted_amount']} TON")
    
    else:
        print("Please specify an action: --set-premium, --set-free, --check-status, or --check-limits")
        sys.exit(1)

if __name__ == "__main__":
    main()
