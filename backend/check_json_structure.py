import json

# Check legitimate_urls.json
with open('legitimate_urls.json', 'r') as f:
    legit = json.load(f)
    print(f"✅ Legitimate URLs: {len(legit['urls'])} URLs, {len(legit['domains'])} domains")
    
# Check phishing_urls.json
with open('phishing_urls.json', 'r') as f:
    phishing = json.load(f)
    print(f"⚠️  Phishing URLs: {len(phishing['urls'])} URLs, {len(phishing['domains'])} domains")

# Test a sample
test_urls = [
    'https://www.google.com',
    'https://www.facebook.com', 
    'https://phishing-test.xyz',
    'https://malicious-site.tk'
]

print("\n🧪 Testing sample URLs:")
for test_url in test_urls:
    clean_url = test_url.lower().strip()
    in_legit = clean_url in legit['urls']
    in_phishing = clean_url in phishing['urls']
    print(f"  {test_url}: Legit={in_legit}, Phishing={in_phishing}")
