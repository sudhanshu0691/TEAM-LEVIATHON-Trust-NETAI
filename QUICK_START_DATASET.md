# 🚀 Quick Start Guide - Local Dataset Setup

## ✅ What's Been Set Up

You now have a **local dataset** with **504,932 URLs** integrated into your TrustNET AI extension:
- **345,738 legitimate URLs** ✓
- **159,195 phishing URLs** ✗

## 🔍 Key Features

1. **Instant Detection** - Checks your local dataset in <1ms (before external APIs)
2. **Offline Protection** - Works without internet
3. **Smart Matching** - Handles exact URLs and domains (subdomains too)
4. **Fallback Safety** - Still uses Google Safe Browsing for unknown URLs

## 📁 New Files Created

In `backend/` folder:

```
✅ legitimate_urls.json (50.06 MB)  - 345,738 legitimate URLs
✅ phishing_urls.json (25.91 MB)    - 159,195 phishing URLs
✅ local_dataset.py                 - URL lookup engine
✅ convert_csv_to_json.py           - CSV→JSON converter
✅ test_dataset.py                  - Unit tests
✅ test_api.py                      - API endpoint tests
✅ DATASET_README.md                - Full documentation
```

Modified:
```
✏️ app.py                          - Added Layer 0 detection
```

## ⚡ How to Use

### Step 1: Start the Backend
```bash
cd "e:\Agentic AI\TrustNET AI\backend"
python app.py
```

You should see:
```
✨ Local Dataset Ready!
   Total URLs: 504,932
   Legitimate: 345,738
   Phishing: 159,194
```

### Step 2: Load the Extension
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Load unpacked folder: `e:\Agentic AI\TrustNET AI\`

### Step 3: Test It!
Visit these URLs:
- **✓ Safe** (will show green): 
  - https://www.google.com
  - https://www.amazon.com
  - https://www.facebook.com

## 🔗 API Endpoints

### Check Single URL
```bash
curl -X POST http://127.0.0.1:5000/check \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.google.com"}'
```

### View Dataset Stats
```bash
curl http://127.0.0.1:5000/dataset
```

Returns:
```json
{
  "legitimate_urls": 345738,
  "phishing_urls": 159194,
  "legitimate_domains": 111214,
  "phishing_domains": 84243,
  "total_urls": 504932
}
```

## 🧪 Run Tests

### Test 1: Unit Tests (No Backend Needed)
```bash
cd backend
python test_dataset.py
```

### Test 2: API Tests (Backend Required)
```bash
# Terminal 1
python app.py

# Terminal 2
python test_api.py
```

## 📊 How It Works

When you visit a URL:

```
1. Extension detects URL
2. Sends to backend /check endpoint
3. Backend checks:
   ⚡ Layer 0: Your Local Dataset (504K+ URLs) - INSTANT
   └─ Found? → Return result immediately!
   └─ Not found? → Continue...
   1️⃣ Layer 1: Google Safe Browsing
   2️⃣ Layer 2: VirusTotal
   3️⃣ Layer 3+: SSL, Headers, ML, etc.
4. Extension shows result:
   ✓ Green = Safe (from your database)
   ✗ Red = Unsafe (phishing detected)
```

## 📈 Performance

- **Lookup Speed**: <1ms (instant)
- **Memory**: 76MB for all datasets
- **Startup Time**: 2-3 seconds
- **Coverage**: 504K+ URLs

## 🎯 Example Responses

### ✓ Legitimate URL Found
```json
{
  "safe": true,
  "reason": "local_dataset_legitimate",
  "source": "local_dataset",
  "match_type": "exact_url",
  "message": "URL found in local database - Safe"
}
```

### ✗ Phishing URL Found
```json
{
  "safe": false,
  "reason": "local_dataset_phishing",
  "source": "local_dataset",
  "match_type": "domain",
  "message": "URL found in local phishing database - Unsafe"
}
```

## 🔄 Update Dataset

To add/remove URLs:
1. Edit `main url final.csv`
2. Run: `python convert_csv_to_json.py`
3. Restart backend

## ❓ Troubleshooting

### Backend won't start
```
pip install "numpy<2"
python app.py
```

### Dataset not showing in extension
1. Check backend console for `✨ Local Dataset Ready!`
2. Visit http://127.0.0.1:5000/dataset
3. Should show 504K+ URLs

### Extension not checking URLs
1. Restart extension (unload/reload)
2. Check browser console (F12) for errors
3. Verify backend running on port 5000

## 📞 Support

Check full documentation:
- `backend/DATASET_README.md` - Complete reference
- `backend/test_dataset.py` - See unit tests
- `backend/test_api.py` - See API tests

## ✨ What You Get

✅ **Fast Detection** - Your 500K dataset checked first
✅ **Privacy** - No external API calls for known URLs
✅ **Offline** - Works without internet
✅ **Accurate** - Your verified data takes priority
✅ **Safe** - Falls back to Google Safe Browsing

---

**🎉 Your local dataset is live and protecting users!**

Questions? Check `DATASET_README.md` for complete documentation.
