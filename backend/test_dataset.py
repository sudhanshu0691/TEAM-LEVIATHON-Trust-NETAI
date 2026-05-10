#!/usr/bin/env python3
"""Test script for local dataset URL checking"""

from local_dataset import LocalDataset
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
ld = LocalDataset(backend_dir)

# Test legitimate URLs
test_legitimate = [
    "https://www.google.com",
    "https://www.facebook.com", 
    "https://www.youtube.com",
    "google.com",  # Domain only
    "mail.google.com"  # Subdomain
]

print("\n✅ Testing LEGITIMATE URL lookups:\n")
for url in test_legitimate:
    result = ld.check_url(url)
    status = "✓ SAFE" if result['safe'] is True else "✗ UNSAFE" if result['safe'] is False else "ℹ️ UNKNOWN"
    print(f"  {status} | {url:<30} | {result['match_type']:<12} | Domain: {result['domain']}")

# Test some phishing URLs
test_phishing = [
    "http://a.phishingsite.net",
    "https://admin-paypal-verify.top",
    "http://amazon-confirm-payment.xyz"
]

print("\n❌ Testing PHISHING URL lookups:\n")
for url in test_phishing:
    result = ld.check_url(url)
    status = "✓ SAFE" if result['safe'] else "✗ UNSAFE"
    if result['found']:
        print(f"  {status} | {url:<40} | {result['match_type']:<12} | Domain: {result['domain']}")
    else:
        print(f"  ℹ️  NOT FOUND | {url:<35} (not in dataset)")

# Test unknown URL
print("\n❓ Testing UNKNOWN URL:\n")
unknown = "https://this-website-does-not-exist-12345.com"
result = ld.check_url(unknown)
print(f"  {'❓' if not result['found'] else '?'} | {unknown:<40} | {result['match_type']:<12}")

print("\n" + "="*80)
print("✅ Test Complete!")
