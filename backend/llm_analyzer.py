"""
LLM-based URL Analyzer - Uses language models for semantic threat analysis
Provides human-readable explanations and context-aware threat detection
"""

import os
import re
from typing import Dict, Optional, Any
from urllib.parse import urlparse, parse_qs
import warnings
from dotenv import load_dotenv

warnings.filterwarnings('ignore')
load_dotenv()


class LLMAnalyzer:
    """
    Uses LLM (Ollama, HuggingFace, or OpenAI) for semantic URL analysis
    Provides threat explanations and behavioral analysis
    """
    
    def __init__(self, use_local: bool = False, api_key: str = None):
        """
        Initialize LLM Analyzer
        
        Args:
            use_local: Use local Ollama model (recommended for privacy)
            api_key: API key for remote LLM services (Grok, OpenAI, HuggingFace)
        """
        self.use_local = use_local
        self.api_key = api_key or os.getenv('XAI_API_KEY') or os.getenv('LLM_API_KEY')
        self.model_type = None
        self.llm_available = False
        
        self._initialize_llm()
    
    def _initialize_llm(self):
        """Initialize the LLM backend"""
        if self.use_local:
            self._init_ollama()
        else:
            self._init_grok()
    
    def _init_ollama(self):
        """Initialize local Ollama model"""
        try:
            import requests
            
            # Check if Ollama is running
            response = requests.get('http://localhost:11434/api/tags', timeout=2)
            if response.status_code == 200:
                self.model_type = 'ollama'
                self.llm_available = True
                print('✓ Connected to Ollama (Local LLM)')
            else:
                print('⚠ Ollama not available - using pattern matching fallback')
        except Exception as e:
            print(f'⚠ Ollama not available: {e} - Using pattern matching fallback')
    
    def _init_grok(self):
        """Initialize Grok API from xAI"""
        try:
            from xai_sdk import Client
            
            if not self.api_key:
                print('⚠ XAI_API_KEY not set - using pattern matching fallback')
                return
            
            self.grok_client = Client(api_key=self.api_key)
            self.model_type = 'grok'
            self.llm_available = True
            print('✓ Connected to Grok LLM (xAI)')
        except ImportError:
            print('⚠ xai-sdk not installed - using pattern matching fallback')
            print('   Install with: pip install xai-sdk')
        except Exception as e:
            print(f'⚠ Grok initialization failed: {e} - using pattern matching fallback')
    
    def _init_openai(self):
        """Initialize OpenAI API (legacy)"""
        try:
            import openai
            
            if not self.api_key:
                print('⚠ LLM_API_KEY not set - using pattern matching fallback')
                return
            
            openai.api_key = self.api_key
            self.model_type = 'openai'
            self.llm_available = True
            print('✓ Connected to OpenAI LLM')
        except Exception as e:
            print(f'⚠ OpenAI initialization failed: {e}')
    
    def analyze_url(self, url: str, ml_result: Dict = None) -> Optional[Dict[str, Any]]:
        """
        Analyze URL using LLM
        
        Args:
            url: URL to analyze
            ml_result: Results from ML models for context
        
        Returns:
            Analysis with threat level and explanation
        """
        if not url:
            return None
        
        try:
            # Get structural analysis
            structural_analysis = self._analyze_url_structure(url)
            
            # Get LLM analysis if available
            if self.llm_available:
                llm_analysis = self._get_llm_analysis(url, structural_analysis, ml_result)
            else:
                llm_analysis = self._get_pattern_analysis(url, structural_analysis)
            
            return {
                'url': url,
                'structural_analysis': structural_analysis,
                'llm_analysis': llm_analysis,
                'threat_level': self._determine_threat_level(structural_analysis, llm_analysis),
                'explanation': llm_analysis.get('explanation', 'Pattern-based analysis'),
                'recommendations': self._get_recommendations(structural_analysis, llm_analysis)
            }
        except Exception as e:
            print(f'LLM analysis error: {e}')
            return None
    
    def _analyze_url_structure(self, url: str) -> Dict:
        """Analyze structural properties of URL"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc if parsed.netloc else parsed.path.split('/')[0]
            
            analysis = {
                'scheme': parsed.scheme,
                'domain': domain,
                'path': parsed.path,
                'query': parsed.query,
                'has_port': ':' in domain,
                'is_https': parsed.scheme == 'https',
                'subdomain_count': domain.count('.') - 1,
                'path_depth': len([p for p in parsed.path.split('/') if p]),
                'query_params': len(parse_qs(parsed.query)),
                'has_suspicious_keywords': self._check_suspicious_keywords(url),
                'has_unicode': self._has_unicode(url),
                'has_redirect_signs': self._check_redirect_signs(url)
            }
            
            return analysis
        except Exception as e:
            print(f'URL structure analysis error: {e}')
            return {}
    
    def _check_suspicious_keywords(self, url: str) -> bool:
        """Check for suspicious keywords"""
        suspicious = [
            'login', 'signin', 'verify', 'confirm', 'update', 'validate',
            'bank', 'paypal', 'amazon', 'apple', 'microsoft', 'google',
            'action', 'admin', 'test', 'temp', 'debug'
        ]
        url_lower = url.lower()
        return any(keyword in url_lower for keyword in suspicious)
    
    def _has_unicode(self, url: str) -> bool:
        """Check for unicode characters (homograph attacks)"""
        try:
            url.encode('ascii')
            return False
        except UnicodeEncodeError:
            return True
    
    def _check_redirect_signs(self, url: str) -> bool:
        """Check for redirect indicators"""
        redirect_patterns = [
            r'http[s]?%3a%2f%2f',  # Encoded URL
            r'url=',
            r'redirect=',
            r'return=',
            r'continue=',
            r'goto='
        ]
        url_lower = url.lower()
        return any(re.search(pattern, url_lower) for pattern in redirect_patterns)
    
    def _get_llm_analysis(self, url: str, structural: Dict, ml_result: Dict = None) -> Dict:
        """Get analysis from LLM"""
        if self.model_type == 'grok':
            return self._grok_analysis(url, structural, ml_result)
        elif self.model_type == 'ollama':
            return self._ollama_analysis(url, structural, ml_result)
        elif self.model_type == 'openai':
            return self._openai_analysis(url, structural, ml_result)
        else:
            return self._get_pattern_analysis(url, structural)
    
    def _grok_analysis(self, url: str, structural: Dict, ml_result: Dict) -> Dict:
        """Analyze using Grok LLM from xAI"""
        try:
            from xai_sdk.chat import user
            
            prompt = self._build_analysis_prompt(url, structural, ml_result)
            
            # Create a chat with Grok
            chat = self.grok_client.chat.create(
                model='grok-3',
                messages=[]
            )
            
            # Add the analysis prompt
            chat.append(user(prompt))
            
            # Get response from Grok
            response = chat.sample()
            analysis_text = response.content if response else 'Unable to analyze'
            
            return {
                'analysis': analysis_text,
                'explanation': analysis_text[:500] if analysis_text else 'No analysis available',
                'model_used': 'grok-3/xai',
                'confidence': 'high'
            }
        except Exception as e:
            print(f'Grok analysis error: {e}')
        
        return self._get_pattern_analysis(url, structural)
    
    def _ollama_analysis(self, url: str, structural: Dict, ml_result: Dict) -> Dict:
        """Analyze using local Ollama model"""
        try:
            import requests
            import json
            
            prompt = self._build_analysis_prompt(url, structural, ml_result)
            
            response = requests.post(
                'http://localhost:11434/api/generate',
                json={
                    'model': 'mistral',  # or 'neural-chat', 'llama2'
                    'prompt': prompt,
                    'stream': False,
                    'temperature': 0.3
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                analysis_text = result.get('response', '')
                return {
                    'analysis': analysis_text,
                    'explanation': analysis_text[:500],
                    'model_used': 'ollama/mistral',
                    'confidence': 'high'
                }
        except Exception as e:
            print(f'Ollama analysis error: {e}')
        
        return self._get_pattern_analysis(url, structural)
    
    def _openai_analysis(self, url: str, structural: Dict, ml_result: Dict) -> Dict:
        """Analyze using OpenAI API"""
        try:
            from openai import OpenAI
            
            prompt = self._build_analysis_prompt(url, structural, ml_result)

            if not self.api_key:
                return self._get_pattern_analysis(url, structural)

            client = OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[
                    {"role": "system", "content": "You are a security expert analyzing URLs for phishing threats. Be concise."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=200
            )

            analysis_text = response.choices[0].message.content or ''
            return {
                'analysis': analysis_text,
                'explanation': analysis_text,
                'model_used': 'openai/gpt-4o-mini',
                'confidence': 'high'
            }
        except Exception as e:
            print(f'OpenAI analysis error: {e}')
        
        return self._get_pattern_analysis(url, structural)
    
    def _build_analysis_prompt(self, url: str, structural: Dict, ml_result: Dict = None) -> str:
        """Build prompt for LLM analysis"""
        ml_context = ''
        if ml_result:
            ml_context = f"\nML Model Assessment: {ml_result.get('confidence', 0)*100:.1f}% confidence, Prediction: {'SAFE' if ml_result.get('safe') else 'PHISHING'}"
        
        prompt = f"""Analyze this URL for phishing threats:

URL: {url}

URL Structure:
- Domain: {structural.get('domain')}
- HTTPS: {structural.get('is_https')}
- Subdomains: {structural.get('subdomain_count')}
- Suspicious Keywords: {structural.get('has_suspicious_keywords')}
- Unicode Characters: {structural.get('has_unicode')}
- Redirect Signs: {structural.get('has_redirect_signs')}
{ml_context}

Provide a brief security assessment:
1. Threat level (SAFE/LOW/MEDIUM/HIGH)
2. Key risks identified
3. One-line recommendation

Keep response under 100 words."""
        
        return prompt
    
    def _get_pattern_analysis(self, url: str, structural: Dict) -> Dict:
        """Fallback pattern-based analysis"""
        risk_score = 0
        risks = []
        
        # SSL check
        if not structural.get('is_https'):
            risk_score += 2
            risks.append('No HTTPS encryption')
        
        # Unicode check
        if structural.get('has_unicode'):
            risk_score += 3
            risks.append('Unicode characters detected (homograph attack risk)')
        
        # Suspicious keywords
        if structural.get('has_suspicious_keywords'):
            risk_score += 2
            risks.append('Contains login/sensitive operation keywords')
        
        # Redirect signs
        if structural.get('has_redirect_signs'):
            risk_score += 2
            risks.append('URL redirect parameters detected')
        
        # Subdomain check
        if structural.get('subdomain_count', 0) > 3:
            risk_score += 1
            risks.append('Excessive subdomains')
        
        # Deep path
        if structural.get('path_depth', 0) > 5:
            risk_score += 1
            risks.append('Deep path structure')
        
        threat_level = 'SAFE'
        if risk_score >= 5:
            threat_level = 'HIGH'
        elif risk_score >= 3:
            threat_level = 'MEDIUM'
        elif risk_score >= 1:
            threat_level = 'LOW'
        
        return {
            'analysis': f"Pattern-based analysis detected {len(risks)} risk factor(s)",
            'explanation': '; '.join(risks) if risks else 'No obvious phishing indicators',
            'model_used': 'pattern_matching',
            'confidence': 'medium',
            'risk_score': risk_score,
            'threat_level': threat_level
        }
    
    def _determine_threat_level(self, structural: Dict, llm_analysis: Dict) -> str:
        """Determine overall threat level"""
        if 'threat_level' in llm_analysis:
            return llm_analysis['threat_level']
        
        risk_score = llm_analysis.get('risk_score', 0)
        
        if risk_score >= 5:
            return 'HIGH'
        elif risk_score >= 3:
            return 'MEDIUM'
        elif risk_score >= 1:
            return 'LOW'
        else:
            return 'SAFE'
    
    def _get_recommendations(self, structural: Dict, llm_analysis: Dict) -> list:
        """Get security recommendations"""
        recommendations = []
        
        if not structural.get('is_https'):
            recommendations.append('✗ Use HTTPS websites only')
        
        if structural.get('has_unicode'):
            recommendations.append('⚠ Verify domain spelling carefully (unicode attack risk)')
        
        if structural.get('has_suspicious_keywords'):
            recommendations.append('⚠ Be cautious with login pages')
        
        if structural.get('has_redirect_signs'):
            recommendations.append('⚠ Hover over links to see actual destination')
        
        if not recommendations:
            recommendations = ['✓ URL appears legitimate']
        
        return recommendations
