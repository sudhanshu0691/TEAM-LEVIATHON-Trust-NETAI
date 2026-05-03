"""
Local Dataset Loader and URL Checker
Loads legitimate and phishing URLs from JSON files for fast O(1) lookups
"""

import json
import os
from urllib.parse import urlparse
from typing import Dict, Optional, Tuple

class LocalDataset:
    """Load and search local URL datasets"""
    
    def __init__(self, backend_dir: str):
        self.backend_dir = backend_dir
        self.legitimate_urls = {}
        self.phishing_urls = {}
        self.legitimate_domains = set()
        self.phishing_domains = set()
        self.loaded = False
        
        # Load datasets on initialization
        self._load_datasets()
    
    def _load_datasets(self):
        """Load legitimate and phishing URLs from JSON files"""
        try:
            # Get absolute path of backend directory
            abs_backend_dir = os.path.abspath(self.backend_dir)
            # Get parent directory (project root) for data files location
            parent_dir = os.path.dirname(abs_backend_dir)
            data_dir = os.path.join(parent_dir, '.data')
            
            # Load legitimate URLs from hidden .data directory
            legitimate_path = os.path.join(data_dir, 'legitimate_urls.json')
            if os.path.exists(legitimate_path):
                print(f'📖 Loading legitimate URLs...')
                with open(legitimate_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.legitimate_urls = data.get('urls', {})
                    self.legitimate_domains = set(data.get('domains', []))
                    legitimate_count = data.get('metadata', {}).get('total_urls', 0)
                    legitimate_domains_count = len(self.legitimate_domains)
                    print(f'✅ Loaded {legitimate_count:,} legitimate URLs ({legitimate_domains_count:,} domains)')
            else:
                print(f'⚠️  Legitimate URLs file not found: {legitimate_path}')
            
            # Load phishing URLs from hidden .data directory
            phishing_path = os.path.join(data_dir, 'phishing_urls.json')
            if os.path.exists(phishing_path):
                print(f'📖 Loading phishing URLs...')
                with open(phishing_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.phishing_urls = data.get('urls', {})
                    self.phishing_domains = set(data.get('domains', []))
                    phishing_count = data.get('metadata', {}).get('total_urls', 0)
                    phishing_domains_count = len(self.phishing_domains)
                    print(f'⚠️  Loaded {phishing_count:,} phishing URLs ({phishing_domains_count:,} domains)')
            else:
                print(f'⚠️  Phishing URLs file not found: {phishing_path}')
            
            self.loaded = bool(self.legitimate_urls or self.phishing_urls)
            if self.loaded:
                print(f'\n✨ Local Dataset Ready!')
                print(f'   Total URLs: {len(self.legitimate_urls) + len(self.phishing_urls):,}')
                print(f'   Legitimate: {len(self.legitimate_urls):,}')
                print(f'   Phishing: {len(self.phishing_urls):,}')
            
        except Exception as e:
            print(f'❌ Error loading datasets: {e}')
            import traceback
            traceback.print_exc()
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL, normalize by removing www. prefix"""
        try:
            if not url.startswith(('http://', 'https://')):
                url = 'https://' + url
            parsed = urlparse(url)
            domain = parsed.netloc or parsed.path.split('/')[0]
            domain = domain.lower().strip()
            # Remove www. prefix for cleaner matching
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except:
            return url.lower().strip()
    
    def check_url(self, url: str) -> Dict:
        """
        Check if URL is legitimate or phishing
        Returns: {
            'found': bool,
            'safe': bool (True=legitimate, False=phishing),
            'type': 'legitimate' | 'phishing' | 'unknown',
            'match_type': 'exact' | 'domain' | 'none',
            'domain': str
        }
        """
        if not self.loaded:
            return {
                'found': False,
                'safe': None,
                'type': 'unknown',
                'match_type': 'none',
                'domain': '',
                'reason': 'dataset_not_loaded'
            }
        
        url_clean = url.strip().lower()
        domain = self._extract_domain(url)
        
        # Check exact URL match first (fastest)
        if url_clean in self.legitimate_urls:
            return {
                'found': True,
                'safe': True,
                'type': 'legitimate',
                'match_type': 'exact_url',
                'domain': domain,
                'reason': 'local_dataset_legitimate'
            }
        
        if url_clean in self.phishing_urls:
            return {
                'found': True,
                'safe': False,
                'type': 'phishing',
                'match_type': 'exact_url',
                'domain': domain,
                'reason': 'local_dataset_phishing'
            }
        
        # Check domain match (handles subdomains)
        if domain in self.legitimate_domains:
            return {
                'found': True,
                'safe': True,
                'type': 'legitimate',
                'match_type': 'domain',
                'domain': domain,
                'reason': 'local_dataset_legitimate'
            }
        
        if domain in self.phishing_domains:
            return {
                'found': True,
                'safe': False,
                'type': 'phishing',
                'match_type': 'domain',
                'domain': domain,
                'reason': 'local_dataset_phishing'
            }
        
        # Not found in dataset
        return {
            'found': False,
            'safe': None,
            'type': 'unknown',
            'match_type': 'none',
            'domain': domain,
            'reason': 'not_in_local_dataset'
        }
    
    def is_legitimate(self, url: str) -> bool:
        """Check if URL is legitimate"""
        result = self.check_url(url)
        return result['safe'] is True
    
    def is_phishing(self, url: str) -> bool:
        """Check if URL is phishing"""
        result = self.check_url(url)
        return result['safe'] is False
    
    def get_stats(self) -> Dict:
        """Get dataset statistics"""
        return {
            'loaded': self.loaded,
            'legitimate_urls': len(self.legitimate_urls),
            'phishing_urls': len(self.phishing_urls),
            'legitimate_domains': len(self.legitimate_domains),
            'phishing_domains': len(self.phishing_domains),
            'total_urls': len(self.legitimate_urls) + len(self.phishing_urls)
        }
