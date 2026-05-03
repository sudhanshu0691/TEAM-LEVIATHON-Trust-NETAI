# 🚨 Warning Banner Testing Guide

## What Was Improved

✅ **Enhanced logging** - Console shows detailed info about banner creation and user actions
✅ **Stronger z-index and !important CSS** - Ensures banner can't be hidden by page styling
✅ **Better error handling** - Falls back to body if documentElement fails
✅ **Explicit safe:false check** - `data.safe === false` ensures banner shows for unsafe URLs
✅ **Button event logging** - Shows what user clicked (Leave Site, Continue, Close)

## How to Test

### Prerequisites
1. Flask backend must be running: `python backend/app.py`
2. Chrome extension must be loaded (Developer Mode)
3. Dev Tools Console must be open to see logs

### Test Case 1: Safe URL (Should NOT show warning)
1. Open new tab
2. Navigate to: `https://google.com`
3. Check Console for: `✅ URL is safe: google.com`
4. **Expected**: No warning banner should appear
5. Extension popup should show: ✅ Green checkmark "Website is Safe"

### Test Case 2: Phishing URL (SHOULD show warning)
1. Open new tab
2. Navigate to: `http://paypal-secure.xyz` or `http://amazon-login.xyz`
3. Wait for page to load (max 10 seconds for backend check)
4. Check Console for: 
   - `🔐 TrustNET AI Backend Response: {safe: false, ...}`
   - `🚨 Showing warning banner for unsafe URL: paypal-secure.xyz`
   - `✅ Warning banner added to page`
5. **Expected**: Red warning banner should appear at TOP of page with:
   - 🚨 or ⚠️ icon (animated pulse)
   - Title: "WARNING: Potentially Dangerous Website Detected" or "PHISHING ALERT"
   - Threat message
   - Threat Level and Detection source
   - 3 buttons: "🚫 Leave Site", "Continue Anyway", "×" close

### Test Case 3: User Interactions
After warning appears, test buttons:

#### Click "🚫 Leave Site"
- Console should show: `🚫 User clicked Leave Site`
- Page should navigate to: `about:blank` (blank page)

#### Click "Continue Anyway"
- Console should show: `✓ User clicked Continue Anyway`
- Warning banner should disappear
- Page content becomes visible

#### Click "×" (Close)
- Console should show: `× User closed warning`
- Warning banner should disappear
- Page content becomes visible

### Test Case 4: Local Threat Detection (No Backend)
1. If backend is DOWN/offline:
2. Navigate to page with suspicious content (fake login form, password field on HTTP)
3. Check Console for: `⚠️ WARNING: Backend error` or similar
4. **Expected**: Warning may still appear based on local content analysis

## Phishing URLs to Test
These should trigger the warning:
- `http://paypal-secure.xyz`
- `http://amazon-login.xyz`
- `http://microsoft-account.tk`
- `http://ebay-confirm.click`
- `http://google-login.ml`

**Note**: Use HTTP not HTTPS for best results (allows fake security header detection)

## Console Debug Output Examples

### Safe URL:
```
✅ TrustNET AI detector initialized
🔐 TrustNET AI Backend Response: {safe: true, reason: "local_dataset_legitimate", ...}
✅ URL is safe: google.com
```

### Phishing URL:
```
✅ TrustNET AI detector initialized
🔐 TrustNET AI Backend Response: {safe: false, reason: "virustotal", message: "This URL has been flagged by multiple security vendors", ...}
🚨 Showing warning banner for unsafe URL: paypal-secure.xyz
✅ Warning banner added to page
```

### Banner Not Found:
```
⚠️ Warning banner already exists
```

### Error Cases:
```
TrustNET AI: Request timeout
TrustNET AI: Backend server not available
TrustNET AI detector error: [error message]
```

## Troubleshooting

### Warning Not Appearing?

1. **Check Console Logs**
   - Open DevTools: F12
   - Check Console tab for TrustNET AI logs
   - Look for error messages

2. **Verify Backend is Running**
   ```bash
   # Should return safe:false for phishing URLs
   curl -X POST http://127.0.0.1:5000/check \
     -H "Content-Type: application/json" \
     -d '{"url": "paypal-secure.xyz", "domain": "paypal-secure.xyz"}'
   ```

3. **Check Extension is Loaded**
   - Go to: chrome://extensions/
   - Ensure "TrustNET AI" is enabled
   - Click "Reload" button

4. **Clear Extension Cache**
   - chrome://extensions/
   - Toggle extension OFF then ON
   - Or restart Chrome

5. **Check Manifest Permissions**
   - Extension needs: `tabs`, `storage`, `scripting`, `<all_urls>`
   - content_scripts must include `src/content/detector.js`

6. **Verify Content Script Injected**
   - Right-click page → "Inspect"
   - Search for: "trustnet-ai-warning-banner"
   - If found: script is running, banner should exist

## Banner Styling

The banner is styled with:
- **Position**: fixed (always visible at top)
- **Z-index**: 2147483647 (maximum, above everything)
- **CSS !important**: Ensures page CSS can't override
- **Red gradient**: #dc2626 to #991b1b
- **Animation**: Slides down from top (0.3s)
- **Icon**: Animated pulse (2s loop)

## Expected Behavior Timeline

```
User navigates to URL (e.g., paypal-secure.xyz)
    ↓
Content script loads and runs
    ↓
Analyzes page content for local threats
    ↓
Sends URL to backend for comprehensive check (0-10 seconds)
    ↓
Backend returns {safe: false, reason: "...", message: "..."}
    ↓
showWarningBanner() is called with threat data
    ↓
✅ Red warning banner appears at top of page
    ↓
User clicks Leave/Continue/Close button
    ↓
Action is logged and executed
```

## Files Modified
- `src/content/detector.js` - Enhanced logging, improved banner visibility
- No changes to manifest.json needed (already configured)
- Backend was already returning safe:false correctly

---
**Last Updated**: May 2, 2026
**Status**: ✅ Ready to test
**Testing Priority**: HIGH (affects user safety)
