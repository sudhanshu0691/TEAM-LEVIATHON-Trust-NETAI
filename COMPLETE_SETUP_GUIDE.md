# 🚀 TrustNET AI - Complete Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Environment Setup](#environment-setup)
4. [Backend Setup](#backend-setup)
5. [Testing Backend](#testing-backend)
6. [Extension Setup](#extension-setup)
7. [Testing Extension](#testing-extension)
8. [Troubleshooting](#troubleshooting)
9. [Usage Guide](#usage-guide)
10. [FAQs](#faqs)

---

## Prerequisites

### System Requirements
- **OS**: Windows 10 or later
- **Python**: 3.9 or higher
- **Chrome/Chromium**: Latest version
- **Disk Space**: At least 2 GB free
- **RAM**: 4GB minimum, 8GB recommended

### Verify Python Installation
```powershell
python --version
# Should show: Python 3.x.x
```

If Python is not installed:
1. Download from: https://www.python.org/downloads/
2. **Important**: Check "Add Python to PATH" during installation
3. Restart your computer

---

## Project Structure

```
e:\Agentic AI\TrustNET AI\
│
├── backend/                          # Flask backend
│   ├── app.py                        # Main Flask app (MODIFIED)
│   ├── local_dataset.py              # URL lookup engine (NEW)
│   ├── convert_csv_to_json.py        # CSV converter
│   ├── model_handler.py              # ML models
│   ├── auto_train.py                 # Auto training
│   ├── llm_analyzer.py               # LLM analyzer
│   ├── test_dataset.py               # Unit tests (NEW)
│   ├── test_api.py                   # API tests (NEW)
│   │
│   ├── legitimate_urls.json          # 50 MB - 345K URLs (NEW)
│   ├── phishing_urls.json            # 26 MB - 159K URLs (NEW)
│   ├── phishing_cnn_model.keras      # ML model
│   │
│   ├── requirements.txt              # Dependencies
│   ├── DATASET_README.md             # Dataset docs (NEW)
│   └── [other model files]
│
├── src/                              # Frontend source
│   ├── App.jsx
│   ├── components/
│   │   ├── Alert.jsx
│   │   ├── Popup.jsx
│   │   ├── Settings.jsx
│   │   └── ...
│   ├── content/
│   │   └── detector.js               # Content script
│   └── utils/
│       ├── apiHandler.js             # API communication
│       └── hashUtil.js
│
├── manifest.json                     # Extension manifest
├── package.json                      # Dependencies
├── main url final.csv                # Original dataset (504K URLs)
├── .venv/                            # Virtual environment
│
├── QUICK_START_DATASET.md            # Quick start (NEW)
└── IMPLEMENTATION_SUMMARY.md         # Summary (NEW)
```

---

## Environment Setup

### Step 1: Open PowerShell Terminal

```powershell
# Press: Windows Key + X → Terminal (Admin)
# Or: Start Menu → PowerShell → Run as Administrator
```

### Step 2: Navigate to Project

```powershell
cd "e:\Agentic AI\TrustNET AI"
```

### Step 3: Create Virtual Environment

```powershell
# Create virtual environment
python -m venv .venv

# Activate it
.\.venv\Scripts\Activate.ps1

# You should see: (.venv) in your prompt
```

**If PowerShell Execution Error:**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

### Step 4: Verify Virtual Environment

```powershell
# You should see (.venv) prefix
# Example: (.venv) PS E:\Agentic AI\TrustNET AI>

# If not shown, activate again:
.\.venv\Scripts\Activate.ps1
```

---

## Backend Setup

### Step 1: Install Python Dependencies

```powershell
# Make sure you're in the project root
cd "e:\Agentic AI\TrustNET AI"

# Ensure virtual environment is activated
.\.venv\Scripts\Activate.ps1

# Install from requirements.txt
pip install -r backend/requirements.txt

# Additional: Fix NumPy compatibility
pip install "numpy<2" --upgrade

# Verify installation
pip list | findstr "flask numpy tensorflow"
```

### Step 2: Verify Dataset Files Exist

```powershell
cd backend

# Check JSON files
Get-Item legitimate_urls.json, phishing_urls.json

# You should see:
# legitimate_urls.json    50.06 MB
# phishing_urls.json      25.91 MB
```

**If files don't exist:**
```powershell
# Regenerate from CSV
python convert_csv_to_json.py

# Wait for completion (~2-3 minutes)
# Should show: ✅ Saved: legitimate_urls.json
#              ✅ Saved: phishing_urls.json
```

### Step 3: Test Backend Startup

```powershell
cd "e:\Agentic AI\TrustNET AI\backend"
python app.py
```

### Expected Output

You should see:
```
📖 Loading legitimate URLs...
✅ Loaded 345,738 legitimate URLs (111,214 domains)
📖 Loading phishing URLs...
⚠️ Loaded 159,195 phishing URLs (84,243 domains)

✨ Local Dataset Ready!
   Total URLs: 504,932
   Legitimate: 345,738
   Phishing: 159,194

[... more initialization messages ...]

============================================================
🛡️ TrustNET AI Backend Server
============================================================
Local Dataset: ✓ Loaded
  Total URLs: 504,932
  Legitimate: 345,738 (111,214 domains)
  Phishing: 159,195 (84,243 domains)

Security Checks Enabled (in order):
  ⚡ Layer 0: Local Dataset Lookup (500K+ URLs)
  1️⃣ Layer 1: Google Safe Browsing
  2️⃣ Layer 2: VirusTotal
  [... more layers ...]

============================================================
 * Running on http://127.0.0.1:5000
 * Press CTRL+C to quit
```

**✅ Backend is ready!**

---

## Testing Backend

### Keep Backend Running

**Terminal 1** (running backend):
```
Press CTRL+C to stop anytime
```

### Open New Terminal

**Terminal 2** - Open new PowerShell:
```powershell
# Press: Windows Key + X → Terminal
cd "e:\Agentic AI\TrustNET AI\backend"
```

### Test 1: Dataset Statistics

```powershell
# Check what's loaded
curl -Uri "http://127.0.0.1:5000/dataset" -Method Get

# Expected response:
# {
#   "status": "success",
#   "local_dataset": {
#     "loaded": true,
#     "legitimate_urls": 345738,
#     "phishing_urls": 159194,
#     "legitimate_domains": 111214,
#     "phishing_domains": 84243,
#     "total_urls": 504932
#   }
# }
```

### Test 2: Check Legitimate URL

```powershell
# Test with Google
curl -Uri "http://127.0.0.1:5000/check" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"url":"https://www.google.com"}'

# Expected response includes:
# "safe": true
# "reason": "local_dataset_legitimate"
# "source": "local_dataset"
# "message": "URL found in local database - Safe"
```

### Test 3: Check Unknown URL

```powershell
# Test with unknown URL
curl -Uri "http://127.0.0.1:5000/check" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"url":"https://brand-new-website-12345.com"}'

# Will use other detection methods (Google Safe Browsing, etc.)
```

### Test 4: Run Unit Tests

```powershell
# Run dataset tests
python test_dataset.py

# Expected output:
# ✅ Testing LEGITIMATE URL lookups:
#   ✓ SAFE | https://www.google.com
#   ✓ SAFE | https://www.facebook.com
#   ...
# ✅ Test Complete!
```

### ✅ Backend Tests Passed!

Keep Terminal 1 running. You'll need the backend for extension testing.

---

## Extension Setup

### Step 1: Build Frontend (Optional)

If you want to rebuild the extension:

```powershell
# Terminal 2 (new window)
cd "e:\Agentic AI\TrustNET AI"

# Install Node dependencies
npm install

# Build
npm run build

# You should see: ✓ built in XXms
```

**Note**: If this fails, it's okay. The extension should still work.

### Step 2: Load Extension in Chrome

1. **Open Chrome**
2. **Type in address bar**: `chrome://extensions/`
3. **Enable "Developer mode"** (toggle top-right)

```
Developer mode  ⚪ ──────► ⚫ (ON)
```

4. **Click "Load unpacked"** button
5. **Select folder**: `e:\Agentic AI\TrustNET AI`
6. **Click "Select Folder"**

### Expected Result

You should see:
```
TrustNET AI
ID: [some-random-id]
Manifest: 3
Status: Enabled
```

**✅ Extension loaded!**

### Step 3: Pin Extension (Optional)

1. Click the **Extensions icon** (puzzle icon) in Chrome
2. Find **TrustNET AI**
3. Click the **pin icon** to keep it visible

---

## Testing Extension

### Open Browser Console

```
Press: F12
Click: Console tab
```

You should see:
```
TrustNET AI detector running
XHR POST http://127.0.0.1:5000/check
```

### Test 1: Visit Legitimate Website

```
Go to: https://www.google.com
```

**Expected:**
- ✅ No alert
- Console shows: `Result: { safe: true, reason: "local_dataset_legitimate" }`
- Extension icon may show green indicator

### Test 2: Visit Another Safe Site

```
Go to: https://www.amazon.com
```

**Expected:**
- ✅ No alert
- Should be detected as safe from local dataset

### Test 3: Visit Unknown Website

```
Go to: https://example.com
```

**Expected:**
- May show no alert (likely safe)
- Uses other detection methods (Google Safe Browsing)

### Test 4: Check Popup

1. **Click extension icon** (TrustNET AI)
2. A popup should appear
3. Shows current domain info
4. Click "Scan" to manually check

### Test 5: Check Settings

1. **Click extension icon**
2. **Click gear icon** (Settings)
3. View options:
   - Enable/Disable protection
   - View whitelist
   - View history

---

## Troubleshooting

### Issue 1: Backend Won't Start

**Error**:
```
AttributeError: _ARRAY_API not found
ModuleNotFoundError: No module named 'flask'
```

**Solution**:
```powershell
# Activate virtual environment
cd "e:\Agentic AI\TrustNET AI"
.\.venv\Scripts\Activate.ps1

# Fix NumPy issue
pip install "numpy<2" --force-reinstall

# Install Flask
pip install flask flask-cors

# Try again
cd backend
python app.py
```

### Issue 2: JSON Files Not Found

**Error**:
```
⚠️ Legitimate URLs file not found
```

**Solution**:
```powershell
cd "e:\Agentic AI\TrustNET AI\backend"

# Regenerate JSON files
python convert_csv_to_json.py

# Wait 2-3 minutes for completion
# Check output shows: ✅ Saved

# Try backend again
python app.py
```

### Issue 3: Port 5000 Already in Use

**Error**:
```
OSError: [WinError 10048] Only one usage of each socket address
```

**Solution**:
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (e.g., PID 1234)
taskkill /PID 1234 /F

# Or: Change port in app.py
# Change: app.run(debug=True, port=5000)
# To:     app.run(debug=True, port=5001)
```

### Issue 4: Extension Not Working

**Error**: Extension loads but doesn't check URLs

**Solution**:

1. **Reload Extension**:
   - Go to `chrome://extensions/`
   - Click reload button on TrustNET AI

2. **Check Backend**:
   ```powershell
   # In new terminal
   curl -Uri "http://127.0.0.1:5000/dataset" -Method Get
   ```
   Should return 504,932 URLs

3. **Check Console** (F12):
   - Look for errors in Console tab
   - Check Network tab for `/check` requests

4. **Restart Everything**:
   ```powershell
   # Terminal 1: Stop backend (CTRL+C)
   # Terminal 2: Close PowerShell
   
   # Start fresh:
   cd "e:\Agentic AI\TrustNET AI\backend"
   python app.py
   
   # Reload extension (chrome://extensions/)
   ```

### Issue 5: Models Not Loading

**Error**:
```
✗ Model not found
⚠️ LLM initialization failed
```

**This is okay!** The local dataset still works. Backend will continue with other detection methods.

### Issue 6: Virtual Environment Not Activating

**Error**:
```
cannot be loaded because running scripts is disabled on this system
```

**Solution**:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

---

## Usage Guide

### Daily Workflow

#### Morning: Start Backend

```powershell
# Terminal 1
cd "e:\Agentic AI\TrustNET AI\backend"
python app.py

# Wait for: ✨ Local Dataset Ready!
```

#### Use Extension

1. Open Chrome
2. Browse normally
3. Extension automatically checks each URL
4. Alerts appear if URL is in phishing database

#### Evening: Stop Backend

```powershell
# In Terminal 1
Press: CTRL+C
```

### Manual URL Checking

**From Command Line:**
```powershell
# Check if URL is safe
curl -Uri "http://127.0.0.1:5000/check" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"url":"https://example.com"}'
```

**From Extension Popup:**
1. Click TrustNET AI icon
2. See current domain status
3. Click "Scan" for detailed check
4. Click Settings for more options

### Update Dataset

To add new URLs:

```powershell
# 1. Edit the CSV file
# File: e:\Agentic AI\TrustNET AI\main url final.csv
# Add new rows: url, legitimate label, phishing label

# 2. Regenerate JSON files
cd backend
python convert_csv_to_json.py

# 3. Restart backend
# CTRL+C to stop, then python app.py

# 4. Reload extension
# Go to chrome://extensions/ and reload
```

---

## FAQs

### Q: Does the extension work offline?
**A:** For URLs in your local dataset (500K+), YES - instant detection without internet. For unknown URLs, it needs internet for Google Safe Browsing.

### Q: How fast is the detection?
**A:** Local dataset lookup is <1ms. Total response usually <100ms.

### Q: Can I add my own URLs?
**A:** Yes! Edit `main url final.csv` and run `convert_csv_to_json.py` to regenerate.

### Q: What if I delete the JSON files?
**A:** Regenerate them: `python convert_csv_to_json.py`

### Q: Why do I need to keep the backend running?
**A:** The extension communicates with the backend API. Without it, the extension can't check URLs.

### Q: Can I change the port from 5000?
**A:** Yes, in `backend/app.py`, change: `app.run(debug=True, port=5000)` → `app.run(debug=True, port=5001)`

### Q: What if Chrome shows permission errors?
**A:** Add to `manifest.json`:
```json
"permissions": [
  "activeTab",
  "scripting",
  "storage"
]
```

### Q: How much space do I need?
**A:** About 500 MB for:
- Virtual environment: 300 MB
- Dataset JSON files: 76 MB
- Models: 100+ MB

### Q: Can I use Python 3.8?
**A:** Recommended Python 3.9+. May work with 3.8 but not guaranteed.

### Q: What if numpy issue persists?
**A:** Try:
```powershell
pip uninstall numpy tensorflow keras -y
pip install "numpy<2"
pip install tensorflow keras
```

---

## Complete Checklist

Before you consider setup complete, verify:

```
ENVIRONMENT:
  ☐ Python 3.9+ installed
  ☐ Virtual environment created (.venv)
  ☐ Virtual environment activated (shows .venv prefix)
  ☐ Dependencies installed (pip list shows flask, numpy, etc.)

BACKEND:
  ☐ legitimate_urls.json exists (50 MB)
  ☐ phishing_urls.json exists (26 MB)
  ☐ Backend starts: python app.py
  ☐ Shows "✨ Local Dataset Ready!"
  ☐ Shows total 504,932 URLs
  ☐ /dataset endpoint returns data
  ☐ /check endpoint works with test URL

TESTING:
  ☐ Unit tests pass: python test_dataset.py
  ☐ Google.com detected as safe
  ☐ Unknown URL handled correctly

EXTENSION:
  ☐ Extension loads in Chrome (chrome://extensions/)
  ☐ Shows as "Enabled"
  ☐ Can open popup
  ☐ Can access settings
  ☐ F12 console shows activity

FULL INTEGRATION:
  ☐ Backend running
  ☐ Extension loaded
  ☐ Visit legitimate URL (google.com)
  ☐ No alert appears
  ☐ Console shows "local_dataset_legitimate"
  ☐ Extension icon shows status
```

**If all checked: ✅ SETUP COMPLETE!**

---

## Quick Reference Commands

```powershell
# Activate virtual environment
cd "e:\Agentic AI\TrustNET AI"
.\.venv\Scripts\Activate.ps1

# Start backend
cd backend
python app.py

# Test backend
curl -Uri "http://127.0.0.1:5000/dataset" -Method Get

# Run unit tests
python test_dataset.py

# Regenerate dataset
python convert_csv_to_json.py

# Check what's running on port 5000
netstat -ano | findstr :5000

# Update dependencies
pip install -r requirements.txt

# Stop backend
# In the terminal running app.py, press: CTRL+C
```

---

## Support & Help

If you encounter issues:

1. **Check logs** - Look at Terminal 1 (backend) for error messages
2. **Test endpoint** - Run `/dataset` test to verify backend
3. **Reload extension** - Go to `chrome://extensions/` and reload
4. **Clear cache** - Press `CTRL+SHIFT+DELETE` in Chrome
5. **Restart** - Stop backend (CTRL+C), close Chrome, start fresh

---

## 🎉 You're All Set!

Your TrustNET AI extension with local dataset is now ready to protect users from phishing and malicious URLs.

**Start with**: `python app.py` in the backend folder, then visit `chrome://extensions/` to load the extension.

Happy protecting! 🛡️
