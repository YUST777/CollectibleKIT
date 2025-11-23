import time
import random
import base64
import string
from typing import Optional
from urllib.parse import quote
import logging

import requests
from .database import BotDatabase

logger = logging.getLogger(__name__)

TONCENTER_URL = "https://toncenter.com/api/v2/getTransactions"

class PaymentManager:
    def __init__(self, db: BotDatabase):
        self.db = db
    
    def generate_secure_memo(self) -> str:
        """Generate a randomized memo without user ID exposure"""
        # Generate 8 random alphanumeric characters
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(8))
    
    def create_payment(self, user_id: int, amount_nano: int, credits_to_grant: int) -> str:
        """Create a new payment request and return the memo"""
        memo = self.generate_secure_memo()
        
        # Ensure memo is unique
        while self.db.get_payment_by_memo(memo):
            memo = self.generate_secure_memo()
        
        self.db.create_payment(user_id, memo, amount_nano, credits_to_grant)
        logger.info(f"Created payment for user {user_id}: memo={memo}, credits={credits_to_grant}")
        return memo
    
    def get_payment_link(self, recv_addr: str, amount_nano: int, memo: str) -> str:
        """Generate Tonkeeper payment link"""
        return f"https://app.tonkeeper.com/transfer/{recv_addr}?amount={amount_nano}&text={quote(memo)}"
    
    def verify_payment(self, memo: str, recv_addr: str) -> bool:
        """Verify payment by checking TON Center API"""
        payment = self.db.get_payment_by_memo(memo)
        if not payment or payment['status'] != 'pending':
            return False
        
        try:
            response = requests.get(TONCENTER_URL, params={
                'address': recv_addr,
                'limit': 50,
                'to_lt': 0,
                'archival': True
            }, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"TON Center API error: {response.status_code}")
                return False
            
            data = response.json()
            if not data.get('ok'):
                logger.error(f"TON Center API not ok: {data}")
                return False
            
            transactions = data.get('result', [])
            payment_time = payment['created_at']
            
            for tx in transactions:
                if tx.get('utime', 0) < payment_time:
                    continue
                
                in_msg = tx.get('in_msg', {})
                if not in_msg:
                    continue
                
                value = int(in_msg.get('value', '0'))
                if value != payment['amount_nano']:
                    continue
                
                # Check memo in comment
                msg_data = in_msg.get('msg_data', {})
                if msg_data.get('@type') == 'msg.dataText':
                    try:
                        comment_bytes = base64.b64decode(msg_data.get('text', ''))
                        comment = comment_bytes.decode('utf-8', errors='ignore').strip()
                        if comment == memo:
                            # Payment verified!
                            tx_hash = tx.get('transaction_id', {}).get('hash', '')
                            self.db.complete_payment(memo, tx_hash)
                            
                            # Add credits to user
                            self.db.add_credits(payment['user_id'], payment['credits_to_grant'])
                            
                            # Record sale
                            amount_ton = payment['amount_nano'] / 1_000_000_000
                            self.db.record_sale(payment['user_id'], payment['id'], amount_ton, payment['credits_to_grant'])
                            
                            logger.info(f"Payment verified: memo={memo}, user={payment['user_id']}, credits={payment['credits_to_grant']}")
                            return True
                    except Exception as e:
                        logger.error(f"Error decoding comment: {e}")
                        continue
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking payment: {e}")
            return False


# Legacy functions for backward compatibility (will be removed)
def build_tonkeeper_link(recv_addr: str, amount_nano: int, memo: str) -> str:
    return f"https://app.tonkeeper.com/transfer/{recv_addr}?amount={amount_nano}&text={quote(memo)}"


def check_payment_via_toncenter(recv_addr: str, amount_nano: int, memo: str, created_after_ts: float) -> bool:
    params = {
        "address": recv_addr,
        "limit": 50,
        "archival": "true",
    }
    r = requests.get(TONCENTER_URL, params=params, timeout=20)
    if r.status_code != 200:
        return False
    data = r.json()
    if not data.get("ok"):
        return False
    for tx in data.get("result", []):
        utime = tx.get("utime", 0)
        if utime <= created_after_ts:
            continue
        in_msg = tx.get("in_msg", {}) or {}
        try:
            value = int(in_msg.get("value", "0"))
        except Exception:
            value = 0
        if value != amount_nano:
            continue
        
        # Check memo in comment
        msg_data = in_msg.get('msg_data', {})
        if msg_data.get('@type') == 'msg.dataText':
            try:
                comment_bytes = base64.b64decode(msg_data.get('text', ''))
                comment = comment_bytes.decode('utf-8', errors='ignore').strip()
                if comment == memo:
                    return True
            except Exception:
                continue
    return False