"""
Model Handler - Manages both XGBoost and CNN models
Automatically selects the best performing model
"""

import os
import joblib
import numpy as np
from typing import Dict, Optional, Tuple, Any
import warnings

warnings.filterwarnings('ignore')

class ModelHandler:
    def __init__(self, backend_dir: str):
        self.backend_dir = backend_dir
        self.xgb_model = None
        self.cnn_model = None
        self.rf_model = None
        self.best_model_type = None
        self.model_performance = {}
        
        self.xgb_path = os.path.join(backend_dir, 'phishing_xgb_model.pkl')
        self.cnn_path = os.path.join(backend_dir, 'phishing_cnn_model.keras')
        self.rf_path = os.path.join(backend_dir, 'phishing_model.pkl')
        
        self._load_models()
    
    def _load_models(self):
        """Load all available models"""
        # Load XGBoost model
        if os.path.exists(self.xgb_path):
            try:
                self.xgb_model = joblib.load(self.xgb_path)
                print('✓ Loaded XGBoost model')
            except Exception as e:
                print(f'✗ Failed to load XGBoost model: {e}')
        
        # Load CNN model (optional - skip if tensorflow not available)
        if os.path.exists(self.cnn_path):
            try:
                import tensorflow as tf
                self.cnn_model = tf.keras.models.load_model(self.cnn_path)
                print('✓ Loaded CNN model')
            except ImportError:
                print('⚠ TensorFlow not available - skipping CNN model (not required)')
            except Exception as e:
                print(f'⚠ Failed to load CNN model: {e} (continuing without it)')
        
        # Load Random Forest model (fallback)
        if os.path.exists(self.rf_path):
            try:
                self.rf_model = joblib.load(self.rf_path)
                print('✓ Loaded Random Forest model')
            except Exception as e:
                print(f'⚠ Failed to load Random Forest model: {e}')
        
        # Determine best model to use
        if self.xgb_model:
            self.best_model_type = 'xgboost'
        elif self.cnn_model:
            self.best_model_type = 'cnn'
        elif self.rf_model:
            self.best_model_type = 'random_forest'
        
        if self.best_model_type:
            print(f'✓ Best model selected: {self.best_model_type}')
        else:
            print('⚠ No ML models available (optional - Grok LLM will handle analysis)')
    
    def predict(self, features: Dict[str, float]) -> Optional[Dict[str, Any]]:
        """
        Make prediction using the best available model
        Returns prediction result with confidence scores
        """
        if not self.best_model_type:
            return None
        
        try:
            # Convert features to array in correct order
            feature_names = [
                'url_length', 'domain_length', 'dot_count', 'hyphen_count',
                'digit_count', 'has_ip', 'subdomain_count', 'suspicious_words',
                'domain_entropy', 'slash_count', 'at_count', 'query_length',
                'special_char_count', 'suspicious_tld', 'is_shortener',
                'domain_to_url_ratio', 'path_to_url_ratio'
            ]
            
            # Create feature array
            feature_values = []
            for name in feature_names:
                feature_values.append(features.get(name, 0.0))
            
            feature_array = np.array([feature_values])
            
            # Get predictions from available models
            predictions = {}
            
            if self.xgb_model:
                xgb_pred = self.xgb_model.predict(feature_array)[0]
                xgb_prob = self.xgb_model.predict_proba(feature_array)[0]
                predictions['xgboost'] = {
                    'prediction': int(xgb_pred),
                    'confidence': float(max(xgb_prob)),
                    'probabilities': [float(p) for p in xgb_prob]
                }
            
            if self.cnn_model:
                # Use the same feature values used during training.
                # Fitting a scaler on a single sample collapses variance and corrupts predictions.
                cnn_pred = self.cnn_model.predict(feature_array, verbose=0)
                cnn_class = np.argmax(cnn_pred[0])
                predictions['cnn'] = {
                    'prediction': int(cnn_class),
                    'confidence': float(cnn_pred[0][cnn_class]),
                    'probabilities': [float(p) for p in cnn_pred[0]]
                }
            
            if self.rf_model:
                rf_pred = self.rf_model.predict(feature_array)[0]
                rf_prob = self.rf_model.predict_proba(feature_array)[0]
                predictions['random_forest'] = {
                    'prediction': int(rf_pred),
                    'confidence': float(max(rf_prob)),
                    'probabilities': [float(p) for p in rf_prob]
                }
            
            # Use ensemble voting if multiple models available
            if len(predictions) > 1:
                votes = [p['prediction'] for p in predictions.values()]
                final_prediction = max(set(votes), key=votes.count)
                avg_confidence = np.mean([p['confidence'] for p in predictions.values()])
                
                return {
                    'safe': final_prediction == 0,
                    'prediction': int(final_prediction),
                    'confidence': float(avg_confidence),
                    'model_type': 'ensemble',
                    'individual_predictions': predictions
                }
            elif self.best_model_type in predictions:
                pred_data = predictions[self.best_model_type]
                return {
                    'safe': pred_data['prediction'] == 0,
                    'prediction': pred_data['prediction'],
                    'confidence': pred_data['confidence'],
                    'model_type': self.best_model_type,
                    'individual_predictions': predictions
                }
        
        except Exception as e:
            print(f'Model prediction error: {e}')
            return None
        
        return None
    
    def is_available(self) -> bool:
        """Check if any model is available"""
        return self.best_model_type is not None
