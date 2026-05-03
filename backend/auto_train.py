"""
Automatic Training Module - Retrains models weekly using collected history data
Runs in background and stores new models
"""

import os
import json
import sqlite3
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
import threading
import time
from typing import Dict, List, Tuple
import joblib

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from xgboost import XGBClassifier
    import tensorflow as tf
except ImportError:
    pass


class AutoTrainer:
    def __init__(self, data_dir: str, backend_dir: str):
        self.data_dir = data_dir
        self.backend_dir = backend_dir
        self.db_path = os.path.join(data_dir, 'trustnet_ai_training.db')
        self.training_enabled = True
        self.last_training = None
        self.training_interval = 7 * 24 * 3600  # 7 days in seconds
        
        self._init_db()
    
    def _init_db(self):
        """Initialize SQLite database for storing training data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create table for URL verdicts
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS url_verdicts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL,
                    safe INTEGER NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    source TEXT,
                    features JSON
                )
            ''')
            
            # Create index for faster queries
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON url_verdicts(timestamp)')
            
            conn.commit()
            conn.close()
            print('✓ Training database initialized')
        except Exception as e:
            print(f'✗ Database initialization error: {e}')
    
    def record_verdict(self, url: str, safe: bool, source: str = 'extension', features: Dict = None):
        """Record a URL verdict for training"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            features_json = json.dumps(features) if features else None
            cursor.execute('''
                INSERT INTO url_verdicts (url, safe, source, features)
                VALUES (?, ?, ?, ?)
            ''', (url, int(not safe), source, features_json))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f'Error recording verdict: {e}')
    
    def get_training_data(self, days: int = 7) -> Tuple[List, List]:
        """Get training data from the last N days"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cutoff_date = datetime.now() - timedelta(days=days)
            cursor.execute('''
                SELECT url, safe, features FROM url_verdicts
                WHERE timestamp > ?
                ORDER BY timestamp DESC
            ''', (cutoff_date.isoformat(),))
            
            rows = cursor.fetchall()
            conn.close()
            
            urls = [row[0] for row in rows]
            labels = [row[1] for row in rows]
            
            return urls, labels
        except Exception as e:
            print(f'Error retrieving training data: {e}')
            return [], []
    
    def extract_features_from_url(self, url: str) -> Dict:
        """Extract features from URL (same as in model_train.py)"""
        from urllib.parse import urlparse
        import socket
        import math
        
        try:
            parsed = urlparse(url)
            domain = parsed.netloc if parsed.netloc else parsed.path.split('/')[0]
            
            features = {}
            features['url_length'] = len(url)
            features['domain_length'] = len(domain)
            features['dot_count'] = domain.count('.')
            features['hyphen_count'] = domain.count('-')
            features['digit_count'] = sum(c.isdigit() for c in domain)
            
            # IP address check
            try:
                socket.inet_aton(domain.split(':')[0])
                features['has_ip'] = 1
            except:
                features['has_ip'] = 0
            
            features['subdomain_count'] = max(0, domain.count('.') - 1)
            
            # Suspicious words
            suspicious = ['login', 'signin', 'verify', 'confirm', 'bank', 'paypal']
            features['suspicious_words'] = sum(1 for w in suspicious if w in url.lower())
            
            # Domain entropy
            entropy = 0
            for x in range(256):
                p_x = float(domain.count(chr(x))) / len(domain) if domain else 0
                if p_x > 0:
                    entropy += -p_x * math.log2(p_x)
            features['domain_entropy'] = entropy
            
            features['slash_count'] = url.count('/')
            features['at_count'] = url.count('@')
            features['query_length'] = len(parsed.query) if parsed.query else 0
            features['special_char_count'] = sum(1 for c in url if c in '!@#$%^&*()_+-=[]{}|;:,.<>?')
            
            # TLD analysis
            tld = '.' + domain.split('.')[-1] if '.' in domain else ''
            suspicious_tlds = ['.xyz', '.top', '.monster', '.tk', '.ml', '.ga', '.cf', '.gq']
            features['suspicious_tld'] = 1 if tld in suspicious_tlds else 0
            
            # URL shortener detection
            shorteners = ['bit.ly', 'goo.gl', 'tinyurl', 't.co', 'ow.ly']
            features['is_shortener'] = 1 if any(sh in domain for sh in shorteners) else 0
            
            # Ratios
            features['domain_to_url_ratio'] = len(domain) / len(url) if url else 0
            features['path_to_url_ratio'] = len(parsed.path) / len(url) if url else 0
            
            return features
        except Exception as e:
            print(f'Feature extraction error: {e}')
            return {}
    
    def train_xgboost(self, X_train, X_test, y_train, y_test):
        """Train XGBoost model"""
        try:
            print('🚀 Training XGBoost model...')
            model = XGBClassifier(
                n_estimators=200,
                max_depth=7,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                n_jobs=-1
            )
            model.fit(X_train, y_train)
            
            accuracy = model.score(X_test, y_test)
            print(f'✓ XGBoost Accuracy: {accuracy*100:.2f}%')
            
            return model, accuracy
        except Exception as e:
            print(f'XGBoost training error: {e}')
            return None, 0
    
    def train_random_forest(self, X_train, X_test, y_train, y_test):
        """Train Random Forest model"""
        try:
            print('🌲 Training Random Forest model...')
            model = RandomForestClassifier(
                n_estimators=200,
                max_depth=25,
                min_samples_split=3,
                min_samples_leaf=1,
                random_state=42,
                n_jobs=-1
            )
            model.fit(X_train, y_train)
            
            accuracy = model.score(X_test, y_test)
            print(f'✓ Random Forest Accuracy: {accuracy*100:.2f}%')
            
            return model, accuracy
        except Exception as e:
            print(f'Random Forest training error: {e}')
            return None, 0
    
    def auto_train(self):
        """Automatic training routine (runs weekly)"""
        print('\n' + '='*70)
        print('🤖 Starting Automatic Weekly Model Retraining')
        print('='*70)
        
        # Get training data from last 7 days
        urls, labels = self.get_training_data(days=7)
        
        if len(urls) < 10:
            print(f'⚠ Insufficient data for training (need 10+, got {len(urls)})')
            return False
        
        print(f'📊 Training data: {len(urls)} URLs collected')
        
        try:
            # Extract features
            print('🔄 Extracting features...')
            features_list = []
            valid_urls = []
            valid_labels = []
            
            for url, label in zip(urls, labels):
                features = self.extract_features_from_url(url)
                if features:
                    features_list.append(features)
                    valid_urls.append(url)
                    valid_labels.append(label)
            
            if len(features_list) < 10:
                print('⚠ Feature extraction failed for most URLs')
                return False
            
            # Convert to DataFrame
            X = pd.DataFrame(features_list)
            y = np.array(valid_labels)
            
            # Train-test split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            models_trained = []
            best_accuracy = 0
            best_model = None
            
            # Train XGBoost
            xgb_model, xgb_acc = self.train_xgboost(X_train, X_test, y_train, y_test)
            if xgb_model and xgb_acc > best_accuracy:
                best_model = xgb_model
                best_accuracy = xgb_acc
                best_model_type = 'xgboost'
            if xgb_model:
                models_trained.append('xgboost')
            
            # Train Random Forest
            rf_model, rf_acc = self.train_random_forest(X_train, X_test, y_train, y_test)
            if rf_model and rf_acc > best_accuracy:
                best_model = rf_model
                best_accuracy = rf_acc
                best_model_type = 'random_forest'
            if rf_model:
                models_trained.append('random_forest')
            
            # Save best model
            if best_model:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                
                if best_model_type == 'xgboost':
                    backup_path = os.path.join(self.backend_dir, f'phishing_xgb_model_backup_{timestamp}.pkl')
                    model_path = os.path.join(self.backend_dir, 'phishing_xgb_model.pkl')
                else:
                    backup_path = os.path.join(self.backend_dir, f'phishing_model_backup_{timestamp}.pkl')
                    model_path = os.path.join(self.backend_dir, 'phishing_model.pkl')
                
                # Backup old model
                if os.path.exists(model_path):
                    os.rename(model_path, backup_path)
                
                # Save new model
                joblib.dump(best_model, model_path)
                
                print(f'\n✓ Best model saved: {best_model_type} ({best_accuracy*100:.2f}% accuracy)')
                print(f'💾 Model path: {model_path}')
                print(f'📦 Backup: {backup_path}')
                
                self.last_training = datetime.now()
                return True
            
            print('✗ No models trained successfully')
            return False
        
        except Exception as e:
            print(f'✗ Auto-training error: {e}')
            import traceback
            traceback.print_exc()
            return False
    
    def start_background_training(self):
        """Start background training thread"""
        def training_loop():
            while self.training_enabled:
                # Check if weekly training is needed
                if self.last_training is None or \
                   (datetime.now() - self.last_training).total_seconds() > self.training_interval:
                    self.auto_train()
                
                # Sleep for 24 hours before next check
                time.sleep(24 * 3600)
        
        thread = threading.Thread(target=training_loop, daemon=True)
        thread.start()
        print('✓ Background training thread started')
