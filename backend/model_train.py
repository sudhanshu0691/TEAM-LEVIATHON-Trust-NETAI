#!/usr/bin/env python3
"""
Train a machine learning model to detect phishing URLs using the PhiUSIIL dataset
This script extracts features from URLs and trains a Random Forest classifier
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
import os
import sys
from urllib.parse import urlparse
import socket
import math

def is_ip_address(domain):
    """Check if domain is an IP address"""
    try:
        socket.inet_aton(domain.split(':')[0])
        return 1
    except:
        return 0

def count_suspicious_words(url):
    """Count suspicious keywords commonly found in phishing URLs"""
    suspicious = [
        'login', 'signin', 'account', 'verify', 'secure', 'update', 
        'confirm', 'bank', 'paypal', 'password', 'suspended', 'locked',
        'click', 'here', 'now', 'urgent', 'immediate', 'alert'
    ]
    url_lower = url.lower()
    return sum(1 for word in suspicious if word in url_lower)

def calculate_entropy(text):
    """Calculate Shannon entropy of text (higher = more random)"""
    if not text:
        return 0.0
    entropy = 0
    for x in range(256):
        p_x = float(text.count(chr(x))) / len(text)
        if p_x > 0:
            entropy += - p_x * math.log2(p_x)
    return entropy

def extract_features(url):
    """Extract features from URL for ML model - must match backend extract_url_features"""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc if parsed.netloc else parsed.path.split('/')[0]
        
        features = {}
        
        # Basic URL properties (must match backend order)
        features['url_length'] = len(url)
        features['domain_length'] = len(domain)
        features['dot_count'] = domain.count('.')
        features['hyphen_count'] = domain.count('-')
        features['digit_count'] = sum(c.isdigit() for c in domain)
        features['has_ip'] = 1 if is_ip_address(domain) else 0
        features['subdomain_count'] = max(0, domain.count('.') - 1)
        features['suspicious_words'] = count_suspicious_words(url)
        features['domain_entropy'] = calculate_entropy(domain)
        features['slash_count'] = url.count('/')
        features['at_count'] = url.count('@')
        features['query_length'] = len(parsed.query) if parsed.query else 0
        features['special_char_count'] = sum(1 for c in url if c in '!@#$%^&*()_+-=[]{}|;:,.<>?')
        
        # TLD analysis
        tld = '.' + domain.split('.')[-1] if '.' in domain else ''
        suspicious_tlds = ['.xyz', '.top', '.monster', '.tk', '.ml', '.ga', '.cf', '.gq',
                          '.click', '.link', '.download', '.work', '.date', '.racing',
                          '.stream', '.review', '.faith', '.loan', '.win', '.bid', '.science']
        features['suspicious_tld'] = 1 if tld in suspicious_tlds else 0
        
        # URL shortener detection
        shorteners = ['bit.ly', 'goo.gl', 'tinyurl', 't.co', 'ow.ly', 'is.gd', 'buff.ly', 'short.link', 'rebrand.ly']
        features['is_shortener'] = 1 if any(sh in domain for sh in shorteners) else 0
        
        # Ratio features
        features['domain_to_url_ratio'] = len(domain) / len(url) if len(url) > 0 else 0
        features['path_to_url_ratio'] = len(parsed.path) / len(url) if len(url) > 0 else 0
        
        return features
    except Exception as e:
        print(f"Error extracting features from {url}: {e}")
        return None

def load_and_prepare_data(csv_path):
    """Load the phishing dataset and prepare features"""
    print(f"📂 Loading dataset from: {csv_path}")
    
    # Try different encodings
    try:
        df = pd.read_csv(csv_path, encoding='utf-8', on_bad_lines='skip')
    except:
        try:
            df = pd.read_csv(csv_path, encoding='latin-1', on_bad_lines='skip')
        except Exception as e:
            print(f"❌ Error loading CSV: {e}")
            return None, None
    
    print(f"✓ Loaded {len(df)} records")
    print(f"Columns: {list(df.columns)}")
    
    # Identify URL and label columns (adjust based on your CSV structure)
    url_col = None
    label_col = None
    
    # Common column name patterns
    for col in df.columns:
        col_lower = col.lower()
        if 'url' in col_lower and url_col is None:
            url_col = col
        if any(x in col_lower for x in ['label', 'class', 'status', 'phish']) and label_col is None:
            label_col = col
    
    if url_col is None:
        print("⚠ Could not identify URL column. Using first column.")
        url_col = df.columns[0]
    
    if label_col is None:
        print("⚠ Could not identify label column. Using last column.")
        label_col = df.columns[-1]
    
    print(f"Using URL column: '{url_col}'")
    print(f"Using Label column: '{label_col}'")
    
    # Extract features
    print("\n🔧 Extracting features from URLs...")
    feature_list = []
    labels = []
    
    processed = 0
    errors = 0
    
    for idx, row in df.iterrows():
        try:
            url = str(row[url_col])
            label = row[label_col]
            
            # Skip invalid URLs
            if not url or url.lower() in ['nan', 'none', '']:
                continue
            
            features = extract_features(url)
            if features is not None:
                feature_list.append(features)
                # Convert label to binary (0 = safe, 1 = phishing)
                # Adjust this based on your dataset's label format
                if isinstance(label, str):
                    labels.append(1 if 'phish' in label.lower() or 'bad' in label.lower() else 0)
                else:
                    labels.append(int(label))
                
                processed += 1
                if processed % 10000 == 0:
                    print(f"  Processed {processed} URLs...")
        except Exception as e:
            errors += 1
            if errors < 10:  # Show first few errors
                print(f"  Error processing row {idx}: {e}")
    
    print(f"\n✓ Successfully processed {processed} URLs")
    print(f"✗ Skipped {errors} invalid entries")
    
    # Convert to DataFrame - ensure consistent feature order
    feature_order = [
        'url_length', 'domain_length', 'dot_count', 'hyphen_count', 'digit_count',
        'has_ip', 'subdomain_count', 'suspicious_words', 'domain_entropy',
        'slash_count', 'at_count', 'query_length', 'special_char_count',
        'suspicious_tld', 'is_shortener', 'domain_to_url_ratio', 'path_to_url_ratio'
    ]
    
    X = pd.DataFrame(feature_list)
    
    # Ensure all features exist, fill missing with 0
    for feat in feature_order:
        if feat not in X.columns:
            X[feat] = 0
    
    # Reorder columns to match expected order
    X = X[feature_order]
    y = np.array(labels)
    
    print(f"\n📊 Dataset shape: {X.shape}")
    print(f"Features ({len(X.columns)}): {list(X.columns)}")
    print(f"Label distribution: Safe={sum(y==0)}, Phishing={sum(y==1)}")
    
    return X, y

def train_model(X, y):
    """Train Random Forest classifier"""
    print("\n🎯 Splitting data: 80% train, 20% test")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Training set: {X_train.shape}")
    print(f"Test set: {X_test.shape}")
    
    print("\n🌲 Training Random Forest Classifier with optimized parameters...")
    # Optimized parameters for maximum accuracy (100% target)
    model = RandomForestClassifier(
        n_estimators=300,  # More trees for better accuracy
        max_depth=30,  # Deeper trees for complex patterns
        min_samples_split=3,  # More granular splits
        min_samples_leaf=1,  # Better pattern detection
        max_features='sqrt',  # Feature sampling
        class_weight='balanced',  # Handle imbalanced data
        bootstrap=True,  # Bootstrap sampling
        oob_score=True,  # Out-of-bag scoring
        random_state=42,
        n_jobs=-1,
        verbose=1
    )
    
    model.fit(X_train, y_train)
    
    print("\n✓ Training completed!")
    
    # Evaluate
    print("\n📈 Evaluating model performance...")
    y_pred = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n🎯 Accuracy: {accuracy*100:.2f}%")
    
    print("\n📊 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Safe', 'Phishing']))
    
    print("\n🔢 Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"True Negatives:  {cm[0][0]}")
    print(f"False Positives: {cm[0][1]}")
    print(f"False Negatives: {cm[1][0]}")
    print(f"True Positives:  {cm[1][1]}")
    
    # Feature importance
    print("\n🔍 Top 10 Most Important Features:")
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    for idx, row in feature_importance.head(10).iterrows():
        print(f"  {row['feature']:20s}: {row['importance']:.4f}")
    
    return model

def main():
    """Main training pipeline"""
    print("=" * 70)
    print("🛡️  TrustNET AI - Phishing Detection Model Training")
    print("=" * 70)
    
    # Find CSV file
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'PhiUSIIL_Phishing_URL_Dataset.csv')
    
    if not os.path.exists(csv_path):
        print(f"❌ Dataset not found at: {csv_path}")
        print("Please ensure the CSV file is in the project root directory.")
        sys.exit(1)
    
    # Load and prepare data
    X, y = load_and_prepare_data(csv_path)
    
    if X is None or len(X) == 0:
        print("❌ Failed to load data. Exiting.")
        sys.exit(1)
    
    # Train model
    model = train_model(X, y)
    
    # Save model
    output_path = os.path.join(os.path.dirname(__file__), 'phishing_model.pkl')
    print(f"\n💾 Saving model to: {output_path}")
    joblib.dump(model, output_path)
    print("✓ Model saved successfully!")
    
    print("\n" + "=" * 70)
    print("🎉 Training completed! You can now run the backend server.")
    print("=" * 70)

if __name__ == '__main__':
    main()
