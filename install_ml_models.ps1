# Install ML Model Dependencies
Write-Host "Installing ML Model Dependencies..." -ForegroundColor Green

# Kill existing Flask server if running
Write-Host "Stopping existing backend server..." -ForegroundColor Yellow
taskkill /PID 10452 /F 2>$null

Start-Sleep -Seconds 2

# Install XGBoost
Write-Host "Installing XGBoost..." -ForegroundColor Cyan
pip install xgboost --upgrade -q

# Install TensorFlow
Write-Host "Installing TensorFlow..." -ForegroundColor Cyan
pip install tensorflow --upgrade -q

# Verify installations
Write-Host "Verifying installations..." -ForegroundColor Yellow
python -c "import xgboost; print('✓ XGBoost installed'); import tensorflow; print('✓ TensorFlow installed')"

Write-Host "Installation complete! Starting backend server..." -ForegroundColor Green
Start-Sleep -Seconds 2

cd backend
python app.py
