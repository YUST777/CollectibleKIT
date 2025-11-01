#!/usr/bin/env python3
"""
Compare how Python requests sends data vs what we need in JavaScript
"""
import requests
import sys

def test_requests_data_string():
    """Test how Python requests.post(data=string) actually sends the data"""
    url = 'https://httpbin.org/post'  # Use httpbin to see what we actually send
    
    # Simulate initData (URL-encoded string)
    initdata = 'user=%7B%22id%22%3A800092886%7D&auth_date=1737145438&hash=abc123'
    
    print("=" * 60)
    print("Python requests.post(url, data=string) test")
    print("=" * 60)
    
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
    
    print(f"\nSending: data='{initdata}'")
    print(f"Content-Type: {headers['Content-Type']}")
    
    try:
        response = requests.post(url, headers=headers, data=initdata, timeout=10)
        result = response.json()
        
        print("\n✅ What Python requests actually sent:")
        print(f"Headers sent: {result.get('headers', {})}")
        print(f"Body (form): {result.get('form', {})}")
        print(f"Body (data): {result.get('data', '')}")
        print(f"Content-Type: {result.get('headers', {}).get('Content-Type', '')}")
        
        # Now test with Stickerdom
        print("\n" + "=" * 60)
        print("Testing with actual Stickerdom API")
        print("=" * 60)
        
        stickerdom_url = 'https://api.stickerdom.store/api/v1/auth'
        
        # You need REAL initData here - get it from your app
        print("\n⚠️ Note: You need real initData from Telegram WebApp")
        print("The initData from the error message is just a preview (truncated)")
        print("\nTo get real initData:")
        print("1. Open your app in Telegram")
        print("2. Open browser console")
        print("3. Run: window.Telegram.WebApp.initData")
        print("4. Copy the full string")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_requests_data_string()





