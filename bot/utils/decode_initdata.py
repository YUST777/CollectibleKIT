#!/usr/bin/env python3
"""
Helper to decode Telegram WebApp initData
Usage: echo "encoded_data" | python3 decode_initdata.py
"""
import sys
import urllib.parse

def decode_initdata(encoded_data):
    """Decode Telegram WebApp initData from encoded format"""
    try:
        decoded = urllib.parse.unquote(encoded_data)
        return decoded
    except Exception as e:
        print(f"Error decoding: {e}", file=sys.stderr)
        return None

if __name__ == '__main__':
    if len(sys.argv) > 1:
        encoded = sys.argv[1]
    else:
        encoded = sys.stdin.read().strip()
    
    decoded = decode_initdata(encoded)
    if decoded:
        print(f"\nDecoded initData:")
        print(decoded)
        print(f"\n✅ Copy this as MANUAL_INIT_DATA")
