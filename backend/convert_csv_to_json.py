#!/usr/bin/env python3
"""
Convert CSV dataset to separate JSON files for legitimate and phishing URLs.
Creates two JSON files: legitimate_urls.json and phishing_urls.json
"""

import json
import csv
import os
from pathlib import Path
from urllib.parse import urlparse

def extract_domain(url):
    """Extract domain from URL, normalize by removing www. prefix"""
    try:
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path.split('/')[0]
        domain = domain.lower().strip()
        # Remove www. prefix for cleaner matching (mail.google.com -> mail.google.com, www.google.com -> google.com)
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain
    except:
        return url.lower().strip()

def convert_csv_to_json():
    """Convert CSV to JSON files"""
    
    # Define paths
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(os.path.dirname(backend_dir), 'main url final.csv')
    legitimate_json = os.path.join(backend_dir, 'legitimate_urls.json')
    phishing_json = os.path.join(backend_dir, 'phishing_urls.json')
    
    print(f"📂 CSV Path: {csv_path}")
    print(f"📂 Backend Dir: {backend_dir}")
    
    # Check if CSV exists
    if not os.path.exists(csv_path):
        print(f"❌ CSV file not found: {csv_path}")
        return False
    
    legitimate_urls = {}
    phishing_urls = {}
    legitimate_domains = set()
    phishing_domains = set()
    
    total_rows = 0
    legitimate_count = 0
    phishing_count = 0
    
    print("\n🔄 Reading CSV and converting to JSON...")
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                total_rows += 1
                url = row.get('url', '').strip()
                
                if not url:
                    continue
                
                # Extract domain for faster lookups
                domain = extract_domain(url)
                
                # Check if legitimate
                legitimate_label = row.get('legitimate label', '').strip().lower()
                if legitimate_label == 'legitimate':
                    legitimate_urls[url] = {
                        'domain': domain,
                        'label': 'legitimate'
                    }
                    legitimate_domains.add(domain)
                    legitimate_count += 1
                
                # Check if phishing
                phishing_label = row.get('phishing label', '').strip().lower()
                if phishing_label in ['phishing', 'phishing_url', 'phishing url']:
                    phishing_urls[url] = {
                        'domain': domain,
                        'label': 'phishing'
                    }
                    phishing_domains.add(domain)
                    phishing_count += 1
                
                # Progress indicator
                if total_rows % 50000 == 0:
                    print(f"  📊 Processed {total_rows:,} rows... (Legitimate: {legitimate_count:,}, Phishing: {phishing_count:,})")
        
        print(f"\n✅ CSV Processing Complete!")
        print(f"  📈 Total rows: {total_rows:,}")
        print(f"  ✔️  Legitimate URLs: {legitimate_count:,}")
        print(f"  ❌ Phishing URLs: {phishing_count:,}")
        print(f"  🔗 Legitimate domains: {len(legitimate_domains):,}")
        print(f"  🔗 Phishing domains: {len(phishing_domains):,}")
        
        # Save legitimate URLs JSON
        print(f"\n💾 Saving legitimate URLs to {legitimate_json}...")
        with open(legitimate_json, 'w', encoding='utf-8') as f:
            json.dump({
                'urls': legitimate_urls,
                'domains': list(legitimate_domains),
                'metadata': {
                    'total_urls': legitimate_count,
                    'total_domains': len(legitimate_domains),
                    'type': 'legitimate'
                }
            }, f, indent=2)
        print(f"✅ Saved: {legitimate_json}")
        
        # Save phishing URLs JSON
        print(f"\n💾 Saving phishing URLs to {phishing_json}...")
        with open(phishing_json, 'w', encoding='utf-8') as f:
            json.dump({
                'urls': phishing_urls,
                'domains': list(phishing_domains),
                'metadata': {
                    'total_urls': phishing_count,
                    'total_domains': len(phishing_domains),
                    'type': 'phishing'
                }
            }, f, indent=2)
        print(f"✅ Saved: {phishing_json}")
        
        # Print file sizes
        legitimate_size = os.path.getsize(legitimate_json) / (1024*1024)  # MB
        phishing_size = os.path.getsize(phishing_json) / (1024*1024)  # MB
        
        print(f"\n📦 File Sizes:")
        print(f"  Legitimate: {legitimate_size:.2f} MB")
        print(f"  Phishing: {phishing_size:.2f} MB")
        print(f"  Total: {(legitimate_size + phishing_size):.2f} MB")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = convert_csv_to_json()
    exit(0 if success else 1)
