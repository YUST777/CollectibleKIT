"""
Daily Withdrawal Tracker
Tracks daily withdrawal limits for free and premium users
"""

import sqlite3
import logging
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class WithdrawalLimits:
    """Withdrawal limits for different user types"""
    FREE_MAX_DAILY = 0.2  # Free users can withdraw max 0.2 TON per day
    FREE_MIN_WITHDRAWAL = 0.2  # Free users need at least 0.2 TON to withdraw
    PREMIUM_MAX_DAILY = 0.5  # Premium users can withdraw max 0.5 TON per day
    PREMIUM_MIN_WITHDRAWAL = 0.2  # Premium users need at least 0.2 TON to withdraw

class DailyWithdrawalTracker:
    """Tracks daily withdrawal limits for users"""
    
    def __init__(self, db_path: str = "bot_data.db"):
        self.db_path = db_path
        self.limits = WithdrawalLimits()
        self._create_tables()
    
    def _create_tables(self):
        """Create necessary database tables"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create daily withdrawals table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS daily_withdrawals (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        withdrawal_date DATE NOT NULL,
                        amount_ton REAL NOT NULL,
                        transaction_id TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, withdrawal_date)
                    )
                """)
                
                # Create user premium status table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_premium_status (
                        user_id INTEGER PRIMARY KEY,
                        is_premium BOOLEAN DEFAULT FALSE,
                        premium_until TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                conn.commit()
                logger.info("Daily withdrawal tracking tables created successfully")
                
        except Exception as e:
            logger.error(f"Failed to create daily withdrawal tables: {e}")
            raise
    
    def set_user_premium_status(self, user_id: int, is_premium: bool, premium_until: Optional[str] = None):
        """Set user's premium status"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO user_premium_status 
                    (user_id, is_premium, premium_until, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                """, (user_id, is_premium, premium_until))
                conn.commit()
                logger.info(f"Set user {user_id} premium status: {is_premium}")
        except Exception as e:
            logger.error(f"Failed to set premium status for user {user_id}: {e}")
    
    def is_user_premium(self, user_id: int) -> bool:
        """Check if user is premium"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT is_premium, premium_until 
                    FROM user_premium_status 
                    WHERE user_id = ?
                """, (user_id,))
                
                result = cursor.fetchone()
                if not result:
                    return False
                
                is_premium, premium_until = result
                
                # Check if premium has expired
                if premium_until:
                    try:
                        premium_until_date = datetime.fromisoformat(premium_until.replace('Z', '+00:00'))
                        if datetime.now() > premium_until_date:
                            # Premium expired, update status
                            self.set_user_premium_status(user_id, False)
                            return False
                    except Exception as e:
                        logger.warning(f"Failed to parse premium_until date: {e}")
                
                return bool(is_premium)
                
        except Exception as e:
            logger.error(f"Failed to check premium status for user {user_id}: {e}")
            return False
    
    def get_daily_withdrawal_amount(self, user_id: int, withdrawal_date: Optional[date] = None) -> float:
        """Get total amount withdrawn by user on a specific date"""
        if withdrawal_date is None:
            withdrawal_date = date.today()
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT COALESCE(SUM(amount_ton), 0) 
                    FROM daily_withdrawals 
                    WHERE user_id = ? AND withdrawal_date = ?
                """, (user_id, withdrawal_date.isoformat()))
                
                result = cursor.fetchone()
                return float(result[0]) if result else 0.0
                
        except Exception as e:
            logger.error(f"Failed to get daily withdrawal amount for user {user_id}: {e}")
            return 0.0
    
    def can_withdraw(self, user_id: int, requested_amount: float, withdrawal_date: Optional[date] = None) -> Dict[str, Any]:
        """Check if user can withdraw the requested amount"""
        if withdrawal_date is None:
            withdrawal_date = date.today()
        
        is_premium = self.is_user_premium(user_id)
        daily_withdrawn = self.get_daily_withdrawal_amount(user_id, withdrawal_date)
        
        # Get limits based on user type
        if is_premium:
            max_daily = self.limits.PREMIUM_MAX_DAILY
            min_withdrawal = self.limits.PREMIUM_MIN_WITHDRAWAL
        else:
            max_daily = self.limits.FREE_MAX_DAILY
            min_withdrawal = self.limits.FREE_MIN_WITHDRAWAL
        
        # Check minimum withdrawal amount
        if requested_amount < min_withdrawal:
            return {
                'can_withdraw': False,
                'reason': f'Minimum withdrawal amount is {min_withdrawal} TON',
                'max_daily': max_daily,
                'daily_withdrawn': daily_withdrawn,
                'remaining_today': max_daily - daily_withdrawn,
                'is_premium': is_premium
            }
        
        # Check if withdrawal would exceed daily limit
        if daily_withdrawn + requested_amount > max_daily:
            # Calculate how much they can actually withdraw
            max_withdrawable = max_daily - daily_withdrawn
            
            if max_withdrawable < min_withdrawal:
                return {
                    'can_withdraw': False,
                    'reason': f'Daily limit reached. You can withdraw again tomorrow.',
                    'max_daily': max_daily,
                    'daily_withdrawn': daily_withdrawn,
                    'remaining_today': 0,
                    'is_premium': is_premium
                }
            else:
                return {
                    'can_withdraw': True,
                    'reason': f'Daily limit reached. Withdrawing {max_withdrawable} TON instead of {requested_amount} TON',
                    'adjusted_amount': max_withdrawable,
                    'max_daily': max_daily,
                    'daily_withdrawn': daily_withdrawn,
                    'remaining_today': max_daily - daily_withdrawn,
                    'is_premium': is_premium
                }
        
        return {
            'can_withdraw': True,
            'reason': 'Withdrawal allowed',
            'adjusted_amount': requested_amount,
            'max_daily': max_daily,
            'daily_withdrawn': daily_withdrawn,
            'remaining_today': max_daily - daily_withdrawn - requested_amount,
            'is_premium': is_premium
        }
    
    def record_withdrawal(self, user_id: int, amount_ton: float, transaction_id: str, withdrawal_date: Optional[date] = None):
        """Record a withdrawal in the daily tracker"""
        if withdrawal_date is None:
            withdrawal_date = date.today()
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if there's already a record for today
                cursor.execute("""
                    SELECT amount_ton FROM daily_withdrawals 
                    WHERE user_id = ? AND withdrawal_date = ?
                """, (user_id, withdrawal_date.isoformat()))
                
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing record
                    new_total = existing[0] + amount_ton
                    cursor.execute("""
                        UPDATE daily_withdrawals 
                        SET amount_ton = ?, transaction_id = ?, created_at = CURRENT_TIMESTAMP
                        WHERE user_id = ? AND withdrawal_date = ?
                    """, (new_total, transaction_id, user_id, withdrawal_date.isoformat()))
                else:
                    # Create new record
                    cursor.execute("""
                        INSERT INTO daily_withdrawals (user_id, withdrawal_date, amount_ton, transaction_id)
                        VALUES (?, ?, ?, ?)
                    """, (user_id, withdrawal_date.isoformat(), amount_ton, transaction_id))
                
                conn.commit()
                logger.info(f"Recorded withdrawal: User {user_id}, Amount {amount_ton} TON, Date {withdrawal_date}")
                
        except Exception as e:
            logger.error(f"Failed to record withdrawal for user {user_id}: {e}")
    
    def get_user_withdrawal_stats(self, user_id: int, days: int = 7) -> Dict[str, Any]:
        """Get user's withdrawal statistics for the last N days"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT withdrawal_date, amount_ton, transaction_id
                    FROM daily_withdrawals 
                    WHERE user_id = ? 
                    AND withdrawal_date >= date('now', '-{} days')
                    ORDER BY withdrawal_date DESC
                """.format(days), (user_id,))
                
                results = cursor.fetchall()
                
                stats = {
                    'user_id': user_id,
                    'is_premium': self.is_user_premium(user_id),
                    'daily_withdrawals': [],
                    'total_withdrawn': 0,
                    'days_with_withdrawals': 0
                }
                
                for row in results:
                    withdrawal_date, amount, tx_id = row
                    stats['daily_withdrawals'].append({
                        'date': withdrawal_date,
                        'amount': amount,
                        'transaction_id': tx_id
                    })
                    stats['total_withdrawn'] += amount
                    stats['days_with_withdrawals'] += 1
                
                return stats
                
        except Exception as e:
            logger.error(f"Failed to get withdrawal stats for user {user_id}: {e}")
            return {'user_id': user_id, 'error': str(e)}


# Global instance
_tracker: Optional[DailyWithdrawalTracker] = None

def get_daily_withdrawal_tracker() -> DailyWithdrawalTracker:
    """Get global daily withdrawal tracker instance"""
    global _tracker
    if _tracker is None:
        _tracker = DailyWithdrawalTracker()
    return _tracker
