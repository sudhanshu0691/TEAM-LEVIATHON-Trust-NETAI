#!/usr/bin/env python3
"""
Test script for TrustNET AI URL Detection System
Tests the complete flow: Legitimate → Alert check
"""

import json
import requests
import sys
from pathlib import Path

# Test data
TEST_CASES = [
    {
        'url': 'https://www.google.com',
        'expected_safe': True,
        'expected_source': 'local_dataset',
        'description': 'Known legitimate URL'
    },
    {
        'url': 'https://www.facebook.com',
        'expected_safe': True,
        'expected_source': 'local_dataset',
        'description': 'Known legitimate URL'
    },
    {
        'url': 'https://www.youtube.com',
        'expected_safe': True,
        'expected_source': 'local_dataset',
        'description': 'Known legitimate URL'
    },
    {
        'url': 'https://unknown-phishing-test.tk',
        'expected_safe': None,  # Will be determined by backend
        'description': 'Unknown/suspicious TLD'
    },
]

class Colors:
    """ANSI color codes"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{text}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.RESET}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.RESET}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.RESET}")

def print_test(text):
    print(f"{Colors.YELLOW}🧪 {text}{Colors.RESET}")

def check_json_files():
    """Verify JSON files exist and have data"""
    print_header("Step 1: Checking JSON Files")
    
    backend_dir = Path(__file__).parent / 'backend'
    legit_file = backend_dir / 'legitimate_urls.json'
    phishing_file = backend_dir / 'phishing_urls.json'
    
    if not legit_file.exists():
        print_error(f"Legitimate URLs file not found: {legit_file}")
        return False
    
    if not phishing_file.exists():
        print_error(f"Phishing URLs file not found: {phishing_file}")
        return False
    
    print_success(f"Found legitimate_urls.json ({legit_file.stat().st_size / 1024 / 1024:.1f} MB)")
    print_success(f"Found phishing_urls.json ({phishing_file.stat().st_size / 1024 / 1024:.1f} MB)")
    
    # Load and verify structure
    with open(legit_file, 'r') as f:
        legit_data = json.load(f)
        legit_urls_count = len(legit_data.get('urls', {}))
        legit_domains_count = len(legit_data.get('domains', []))
    
    with open(phishing_file, 'r') as f:
        phishing_data = json.load(f)
        phishing_urls_count = len(phishing_data.get('urls', {}))
        phishing_domains_count = len(phishing_data.get('domains', []))
    
    print_info(f"Legitimate: {legit_urls_count:,} URLs, {legit_domains_count:,} domains")
    print_info(f"Phishing: {phishing_urls_count:,} URLs, {phishing_domains_count:,} domains")
    
    return True

def check_backend_running():
    """Check if Flask backend is running"""
    print_header("Step 2: Checking Backend Server")
    
    try:
        response = requests.get('http://127.0.0.1:5000/health', timeout=2)
        print_success("Backend server is running on http://127.0.0.1:5000")
        return True
    except requests.exceptions.ConnectionError:
        print_error("Backend server is NOT running")
        print_info("Start the backend with: python backend/app.py")
        return False
    except Exception as e:
        print_error(f"Error checking backend: {e}")
        return False

def test_url_checks():
    """Test URL checking functionality"""
    print_header("Step 3: Testing URL Checks")
    
    results = {
        'passed': 0,
        'failed': 0,
        'details': []
    }
    
    for i, test_case in enumerate(TEST_CASES, 1):
        print_test(f"Test {i}: {test_case['description']}")
        print(f"   URL: {test_case['url']}")
        
        try:
            response = requests.post(
                'http://127.0.0.1:5000/check',
                json={'url': test_case['url']},
                timeout=15
            )
            
            if response.status_code != 200:
                print_error(f"Server returned status {response.status_code}")
                results['failed'] += 1
                continue
            
            data = response.json()
            
            # Check result
            is_safe = data.get('safe')
            source = data.get('source')
            reason = data.get('reason')
            message = data.get('message', '')
            
            print(f"   Safe: {is_safe}")
            print(f"   Source: {source}")
            print(f"   Reason: {reason}")
            print(f"   Message: {message}")
            
            # Verify expectations
            test_passed = True
            
            if test_case['expected_safe'] is not None:
                if is_safe != test_case['expected_safe']:
                    print_error(f"Expected safe={test_case['expected_safe']}, got {is_safe}")
                    test_passed = False
            
            if test_case.get('expected_source') and source:
                if test_case['expected_source'] not in source.lower():
                    print_error(f"Expected source containing '{test_case['expected_source']}', got {source}")
                    test_passed = False
            
            if test_passed:
                print_success("Test passed ✓")
                results['passed'] += 1
            else:
                results['failed'] += 1
            
            results['details'].append({
                'test': test_case['description'],
                'url': test_case['url'],
                'safe': is_safe,
                'source': source,
                'reason': reason,
                'passed': test_passed
            })
            
        except Exception as e:
            print_error(f"Test failed with error: {e}")
            results['failed'] += 1
        
        print()
    
    return results

def test_local_dataset_lookup():
    """Test direct JSON lookup"""
    print_header("Step 4: Testing Local Dataset Lookup")
    
    backend_dir = Path(__file__).parent / 'backend'
    legit_file = backend_dir / 'legitimate_urls.json'
    phishing_file = backend_dir / 'phishing_urls.json'
    
    with open(legit_file, 'r') as f:
        legit_data = json.load(f)
    
    with open(phishing_file, 'r') as f:
        phishing_data = json.load(f)
    
    test_url = 'https://www.google.com'
    test_url_lower = test_url.lower().strip()
    
    in_legit = test_url_lower in legit_data['urls']
    in_phishing = test_url_lower in phishing_data['urls']
    
    print(f"Testing: {test_url}")
    print(f"In Legitimate DB: {in_legit}")
    print(f"In Phishing DB: {in_phishing}")
    
    if in_legit and not in_phishing:
        print_success("✓ Correctly identified as legitimate")
        return True
    elif in_phishing and not in_legit:
        print_success("✓ Correctly identified as phishing")
        return True
    else:
        print_error("✗ Lookup failed")
        return False

def print_summary(results):
    """Print test summary"""
    print_header("Test Summary")
    
    total = results['passed'] + results['failed']
    if total == 0:
        print_error("No tests were run")
        return
    
    pass_rate = (results['passed'] / total) * 100
    
    print(f"Total Tests: {total}")
    print_success(f"Passed: {results['passed']}")
    print_error(f"Failed: {results['failed']}")
    print_info(f"Pass Rate: {pass_rate:.1f}%")
    
    if pass_rate == 100:
        print_success("\n🎉 All tests passed!")
        return True
    else:
        print_error(f"\n⚠️  {results['failed']} test(s) failed")
        return False

def main():
    """Run all tests"""
    print(f"{Colors.BOLD}{Colors.BLUE}")
    print(r"""
    ████████╗██████╗ ██╗   ██╗███████╗████████╗███╗   ██╗███████╗████████╗
    ╚══██╔══╝██╔══██╗██║   ██║██╔════╝╚══██╔══╝████╗  ██║██╔════╝╚══██╔══╝
       ██║   ██████╔╝██║   ██║███████╗   ██║   ██╔██╗ ██║█████╗     ██║   
       ██║   ██╔══██╗██║   ██║╚════██║   ██║   ██║╚██╗██║██╔══╝     ██║   
       ██║   ██║  ██║╚██████╔╝███████║   ██║   ██║ ╚████║███████╗   ██║   
       ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═══╝╚══════╝   ╚═╝   
    """)
    print(f"URL Detection System Test Suite{Colors.RESET}\n")
    
    # Run tests
    all_passed = True
    
    if not check_json_files():
        all_passed = False
    
    if not check_backend_running():
        print_error("Cannot continue without backend")
        sys.exit(1)
    
    if not test_local_dataset_lookup():
        all_passed = False
    
    results = test_url_checks()
    
    print_summary(results)
    
    if results['details']:
        print_header("Detailed Results")
        for detail in results['details']:
            status = "✅" if detail['passed'] else "❌"
            print(f"{status} {detail['test']}")
            print(f"   URL: {detail['url']}")
            print(f"   Safe: {detail['safe']} | Source: {detail['source']}")
    
    sys.exit(0 if all_passed and results['passed'] > 0 else 1)

if __name__ == '__main__':
    main()
