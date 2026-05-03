#!/usr/bin/env python3
"""
Test script for testing the /check endpoint with local dataset
This makes actual HTTP requests to the Flask backend
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000"

def test_endpoint(url, label):
    """Test a single URL against the /check endpoint"""
    try:
        response = requests.post(f"{BASE_URL}/check", json={"url": url}, timeout=5)
        data = response.json()
        
        safe_status = "✓ SAFE" if data.get('safe') else "✗ UNSAFE"
        reason = data.get('reason', 'unknown')
        source = data.get('source', 'external')
        
        print(f"{safe_status} | {label:<30} | {reason:<30} | {source}")
        return data
    except requests.exceptions.ConnectionError:
        print(f"❌ ERROR | {label:<30} | Backend not running")
        return None
    except Exception as e:
        print(f"⚠️  ERROR | {label:<30} | {str(e)[:40]}")
        return None

def main():
    print("\n" + "="*100)
    print("🧪 TESTING LOCAL DATASET URL DETECTION")
    print("="*100)
    
    # Check if backend is running
    try:
        response = requests.get(f"{BASE_URL}/dataset", timeout=2)
        stats = response.json()
        print(f"\n✅ Backend Connected!")
        print(f"   Local Dataset: {stats['local_dataset']['total_urls']:,} URLs")
        print(f"   - Legitimate: {stats['local_dataset']['legitimate_urls']:,}")
        print(f"   - Phishing: {stats['local_dataset']['phishing_urls']:,}")
    except:
        print("\n❌ ERROR: Backend not running! Start it with: python app.py")
        return
    
    print("\n" + "─"*100)
    print("TEST 1: Legitimate URLs (should return SAFE)")
    print("─"*100)
    
    legitimate_urls = [
        ("https://www.google.com", "Google"),
        ("https://www.facebook.com", "Facebook"),
        ("https://www.youtube.com", "YouTube"),
        ("https://www.amazon.com", "Amazon"),
        ("https://www.microsoft.com", "Microsoft"),
    ]
    
    for url, label in legitimate_urls:
        test_endpoint(url, label)
    
    print("\n" + "─"*100)
    print("TEST 2: Unknown URLs (may use other detection methods)")
    print("─"*100)
    
    unknown_urls = [
        ("https://example-random-12345.com", "Random URL"),
        ("https://this-does-not-exist.net", "Non-existent"),
    ]
    
    for url, label in unknown_urls:
        test_endpoint(url, label)
    
    print("\n" + "="*100)
    print("✅ Test Summary")
    print("="*100)
    print("Legitimate URLs: Should show 'reason: local_dataset_legitimate'")
    print("Unknown URLs: May use Google Safe Browsing or other layers")
    print("="*100 + "\n")

if __name__ == '__main__':
    main()
