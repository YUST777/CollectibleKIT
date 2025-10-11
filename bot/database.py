import sqlite3
import os
import time
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class BotDatabase:
    def __init__(self, db_path: str = None):
        if db_path is None:
            # Store database in the same directory as the bot
            db_path = os.path.join(os.path.dirname(__file__), "bot_data.db")
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    username TEXT,
                    first_name TEXT,
                    free_uses INTEGER DEFAULT 0,
                    credits INTEGER DEFAULT 0,
                    created_at REAL DEFAULT 0,
                    last_activity REAL DEFAULT 0
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    memo TEXT UNIQUE,
                    amount_nano INTEGER,
                    credits_to_grant INTEGER,
                    status TEXT DEFAULT 'pending',
                    created_at REAL,
                    completed_at REAL DEFAULT NULL,
                    transaction_hash TEXT DEFAULT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    request_type TEXT,
                    image_size TEXT,
                    pieces_count INTEGER,
                    watermarked BOOLEAN,
                    credits_used INTEGER DEFAULT 0,
                    created_at REAL,
                    processing_time REAL DEFAULT NULL,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sales (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    payment_id INTEGER,
                    amount_ton REAL,
                    credits_purchased INTEGER,
                    completed_at REAL,
                    FOREIGN KEY (user_id) REFERENCES users (user_id),
                    FOREIGN KEY (payment_id) REFERENCES payments (id)
                )
            """)
            
            # Track all bot interactions for analytics
            conn.execute("""
                CREATE TABLE IF NOT EXISTS interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    interaction_type TEXT,  -- 'start', 'free_plan', 'paid_plan', 'photo_upload', 'command', etc.
                    data TEXT DEFAULT NULL,  -- JSON data for additional context
                    created_at REAL,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            """)
            
            # Track user sessions and activity patterns
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    session_start REAL,
                    session_end REAL DEFAULT NULL,
                    interactions_count INTEGER DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            """)
            
            conn.commit()
            logger.info("Database initialized successfully")
    
    def get_user(self, user_id: int, username: str = None, first_name: str = None) -> Dict[str, Any]:
        """Get or create user record"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Try to get existing user
            cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            user = cursor.fetchone()
            
            if user:
                # Update last activity and user info if provided
                conn.execute("""
                    UPDATE users 
                    SET last_activity = ?, username = COALESCE(?, username), first_name = COALESCE(?, first_name)
                    WHERE user_id = ?
                """, (time.time(), username, first_name, user_id))
                conn.commit()
                return dict(user)
            else:
                # Create new user
                conn.execute("""
                    INSERT INTO users (user_id, username, first_name, created_at, last_activity)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, username, first_name, time.time(), time.time()))
                conn.commit()
                return {
                    'user_id': user_id,
                    'username': username,
                    'first_name': first_name,
                    'free_uses': 0,
                    'credits': 0,
                    'created_at': time.time(),
                    'last_activity': time.time()
                }
    
    def update_user_credits(self, user_id: int, credits: int):
        """Update user credits"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("UPDATE users SET credits = ? WHERE user_id = ?", (credits, user_id))
            conn.commit()
    
    def update_user_free_uses(self, user_id: int, free_uses: int):
        """Update user free uses"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("UPDATE users SET free_uses = ? WHERE user_id = ?", (free_uses, user_id))
            conn.commit()
    
    def add_credits(self, user_id: int, amount: int):
        """Add credits to user"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("UPDATE users SET credits = credits + ? WHERE user_id = ?", (amount, user_id))
            conn.commit()
    
    def consume_credit(self, user_id: int) -> bool:
        """Consume one credit if available"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT credits FROM users WHERE user_id = ?", (user_id,))
            result = cursor.fetchone()
            
            if result and result[0] > 0:
                conn.execute("UPDATE users SET credits = credits - 1 WHERE user_id = ?", (user_id,))
                conn.commit()
                return True
            return False
    
    def use_free_cut(self, user_id: int) -> bool:
        """Use one free cut if available"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT free_uses FROM users WHERE user_id = ?", (user_id,))
            result = cursor.fetchone()
            
            if result and result[0] < 3:  # FREE_LIMIT = 3
                conn.execute("UPDATE users SET free_uses = free_uses + 1 WHERE user_id = ?", (user_id,))
                conn.commit()
                return True
            return False
    
    def create_payment(self, user_id: int, memo: str, amount_nano: int, credits_to_grant: int) -> int:
        """Create a new payment record"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO payments (user_id, memo, amount_nano, credits_to_grant, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, memo, amount_nano, credits_to_grant, time.time()))
            conn.commit()
            return cursor.lastrowid
    
    def get_payment_by_memo(self, memo: str) -> Optional[Dict[str, Any]]:
        """Get payment by memo"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM payments WHERE memo = ?", (memo,))
            result = cursor.fetchone()
            return dict(result) if result else None
    
    def complete_payment(self, memo: str, transaction_hash: str = None) -> bool:
        """Mark payment as completed"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE payments 
                SET status = 'completed', completed_at = ?, transaction_hash = ?
                WHERE memo = ? AND status = 'pending'
            """, (time.time(), transaction_hash, memo))
            
            if cursor.rowcount > 0:
                conn.commit()
                return True
            return False
    
    def record_sale(self, user_id: int, payment_id: int, amount_ton: float, credits_purchased: int):
        """Record a completed sale"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO sales (user_id, payment_id, amount_ton, credits_purchased, completed_at)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, payment_id, amount_ton, credits_purchased, time.time()))
            conn.commit()
    
    def record_request(self, user_id: int, request_type: str, image_size: str, 
                      pieces_count: int, watermarked: bool, credits_used: int = 0, 
                      processing_time: float = None):
        """Record an image processing request"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO requests (user_id, request_type, image_size, pieces_count, 
                                    watermarked, credits_used, created_at, processing_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, request_type, image_size, pieces_count, watermarked, 
                  credits_used, time.time(), processing_time))
            conn.commit()
    
    def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """Get user statistics"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get user info
            cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            user = cursor.fetchone()
            
            # Get request count
            cursor.execute("SELECT COUNT(*) as request_count FROM requests WHERE user_id = ?", (user_id,))
            request_count = cursor.fetchone()['request_count']
            
            # Get total spent
            cursor.execute("SELECT SUM(amount_ton) as total_spent FROM sales WHERE user_id = ?", (user_id,))
            total_spent = cursor.fetchone()['total_spent'] or 0
            
            return {
                'user': dict(user) if user else None,
                'request_count': request_count,
                'total_spent': total_spent
            }
    
    def record_interaction(self, user_id: int, interaction_type: str, data: str = None) -> None:
        """Record user interaction for analytics"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO interactions (user_id, interaction_type, data, created_at)
                VALUES (?, ?, ?, ?)
            """, (user_id, interaction_type, data, time.time()))
            conn.commit()
    
    def start_session(self, user_id: int) -> int:
        """Start a new user session, returns session_id"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO user_sessions (user_id, session_start, interactions_count)
                VALUES (?, ?, 0)
            """, (user_id, time.time()))
            conn.commit()
            return cursor.lastrowid
    
    def update_session(self, user_id: int) -> None:
        """Update the latest session for a user"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE user_sessions 
                SET session_end = ?, interactions_count = interactions_count + 1
                WHERE user_id = ? AND session_end IS NULL
            """, (time.time(), user_id))
            conn.commit()
    
    def get_analytics_summary(self) -> Dict[str, Any]:
        """Get comprehensive analytics for the bot"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Total users
            cursor.execute("SELECT COUNT(*) as total_users FROM users")
            total_users = cursor.fetchone()['total_users']
            
            # Active users (last 7 days)
            week_ago = time.time() - (7 * 24 * 3600)
            cursor.execute("SELECT COUNT(*) as active_users FROM users WHERE last_activity > ?", (week_ago,))
            active_users = cursor.fetchone()['active_users']
            
            # Total interactions
            cursor.execute("SELECT COUNT(*) as total_interactions FROM interactions")
            total_interactions = cursor.fetchone()['total_interactions']
            
            # Interactions by type
            cursor.execute("""
                SELECT interaction_type, COUNT(*) as count 
                FROM interactions 
                GROUP BY interaction_type 
                ORDER BY count DESC
            """)
            interactions_by_type = dict(cursor.fetchall())
            
            # Total revenue
            cursor.execute("SELECT SUM(amount_ton) as total_revenue FROM sales")
            total_revenue = cursor.fetchone()['total_revenue'] or 0
            
            # Total requests processed
            cursor.execute("SELECT COUNT(*) as total_requests FROM requests")
            total_requests = cursor.fetchone()['total_requests']
            
            # Free vs paid requests
            cursor.execute("""
                SELECT 
                    SUM(CASE WHEN credits_used = 0 THEN 1 ELSE 0 END) as free_requests,
                    SUM(CASE WHEN credits_used > 0 THEN 1 ELSE 0 END) as paid_requests
                FROM requests
            """)
            request_breakdown = cursor.fetchone()
            
            return {
                'total_users': total_users,
                'active_users_7d': active_users,
                'total_interactions': total_interactions,
                'interactions_by_type': interactions_by_type,
                'total_revenue_ton': total_revenue,
                'total_requests': total_requests,
                'free_requests': request_breakdown['free_requests'],
                'paid_requests': request_breakdown['paid_requests']
            }
