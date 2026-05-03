// background.js - MV3 service worker for TrustNET AI extension

const BACKEND_URL = 'http://127.0.0.1:5000';
const CHECK_ENDPOINT = `${BACKEND_URL}/check`;

// Store recently checked URLs to avoid duplicate checks
const checkedUrls = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Track suspicious network activity per tab
const suspiciousActivity = new Map();

// Criterion 7: Network Request Monitoring
// Known C&C server indicators and malicious IP patterns
const SUSPICIOUS_PATTERNS = {
  cc_servers: [
    // Common C&C patterns
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+/,  // Direct IP with port
    /\.tk$/, /\.ml$/, /\.ga$/, /\.cf$/, /\.gq$/,  // Free TLDs
  ],
  tracking_excessive: [],  // Will track excessive tracking
  data_exfiltration: [
    /data:image/, /data:text/, /blob:/  // Data URIs
  ]
};

// Listen for web requests to detect suspicious network activity
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const tabId = details.tabId;
    const url = details.url;
    
    if (tabId < 0) return;  // Skip background requests
    
    // Initialize tracking for this tab
    if (!suspiciousActivity.has(tabId)) {
      suspiciousActivity.set(tabId, {
        externalRequests: 0,
        suspiciousHosts: new Set(),
        dataUris: 0,
        trackingRequests: 0,
        lastCheck: Date.now()
      });
    }
    
    const activity = suspiciousActivity.get(tabId);
    
    try {
      const requestUrl = new URL(url);
      const tabUrl = new URL(details.initiator || details.documentUrl || '');
      
      // Count external requests
      if (requestUrl.hostname !== tabUrl.hostname) {
        activity.externalRequests++;
      }
      
      // Check for suspicious patterns
      SUSPICIOUS_PATTERNS.cc_servers.forEach(pattern => {
        if (pattern.test(url)) {
          activity.suspiciousHosts.add(requestUrl.hostname);
        }
      });
      
      // Check for data exfiltration
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        activity.dataUris++;
      }
      
      // Check for tracking requests
      const trackingIndicators = ['track', 'analytics', 'pixel', 'beacon', 'collect'];
      if (trackingIndicators.some(indicator => url.includes(indicator))) {
        activity.trackingRequests++;
      }
      
      // Alert if suspicious activity threshold exceeded
      if (activity.suspiciousHosts.size > 3 || activity.dataUris > 10 || activity.externalRequests > 100) {
        // Update badge to show warning
        chrome.action.setBadgeText({ text: '⚠', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
      }
      
    } catch (e) {
      // Ignore URL parsing errors
    }
  },
  { urls: ['<all_urls>'] }
);

// Clean up suspicious activity tracking when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  suspiciousActivity.delete(tabId);
  checkedUrls.delete(tabId);
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !isInternalUrl(tab.url)) {
    await checkUrlSafety(tabId, tab.url);
  }
});

// Listen for new tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && !isInternalUrl(tab.url)) {
      await checkUrlSafety(activeInfo.tabId, tab.url);
    }
  } catch (e) {
    console.error('Error checking activated tab:', e);
  }
});

function isInternalUrl(url) {
  return url.startsWith('chrome://') || 
         url.startsWith('chrome-extension://') || 
         url.startsWith('about:') ||
         url.startsWith('edge://');
}

async function checkUrlSafety(tabId, url) {
  try {
    // Check if protection is enabled
    const { trustnet_ai_protection = true } = await chrome.storage.local.get(['trustnet_ai_protection']);
    if (!trustnet_ai_protection) {
      chrome.action.setBadgeText({ text: '', tabId });
      return;
    }

    const domain = new URL(url).hostname;

    // Check whitelist
    const { trustnet_ai_whitelist = [] } = await chrome.storage.local.get(['trustnet_ai_whitelist']);
    if (trustnet_ai_whitelist.includes(domain)) {
      chrome.action.setBadgeText({ text: '✓', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
      return;
    }

    // Check cache
    const cached = checkedUrls.get(url);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      updateBadge(tabId, cached.result);
      return;
    }

    // Hash URL for privacy
    const hashedUrl = await hashUrl(url);

    // Check with backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(CHECK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: url,
          hashed_url: hashedUrl, 
          domain: domain 
        }),
        signal: controller.signal
      }).catch(fetchError => {
        // Handle network errors more gracefully
        if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          throw new Error('Backend server is not running. Please start the Flask backend server on port 5000.');
        }
        throw fetchError;
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
    
      // Cache result
      checkedUrls.set(url, { result, timestamp: Date.now() });

      // Update badge
      updateBadge(tabId, result);

      // If unsafe, notify content script to show warning
      if (!result.safe) {
        chrome.tabs.sendMessage(tabId, {
          type: 'UNSAFE_SITE_DETECTED',
          data: result
        }).catch(e => console.log('Could not send message to content script:', e));
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log('Background check timeout:', url);
        chrome.action.setBadgeText({ text: '⏱', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
      } else if (error.message && error.message.includes('Backend server is not running')) {
        console.error('❌ Backend Error:', error.message);
        console.error('💡 Solution: Start the backend server with: cd backend && python app.py');
        // Show warning badge to indicate backend is down
        chrome.action.setBadgeText({ text: '⚠', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
      } else {
        console.error('Background check error:', error);
        // On error, show neutral badge
        chrome.action.setBadgeText({ text: '?', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId });
      }
    }
  } catch (error) {
    console.error('Background check error:', error);
    // On error, show neutral badge
    chrome.action.setBadgeText({ text: '?', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId });
  }
}

function updateBadge(tabId, result) {
  if (result.safe) {
    chrome.action.setBadgeText({ text: '✓', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
  } else {
    chrome.action.setBadgeText({ text: '!', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId });
  }
}

async function hashUrl(url) {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Listen to messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_URL') {
    (async () => {
      try {
        const domain = new URL(message.url).hostname;
        const hashedUrl = await hashUrl(message.url);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const response = await fetch(CHECK_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              url: message.url,
              hashed_url: hashedUrl, 
              domain: domain 
            }),
            signal: controller.signal
          }).catch(fetchError => {
            // Handle network errors more gracefully
            if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
              throw new Error('Backend server is not running. Please start the Flask backend server on port 5000.');
            }
            throw fetchError;
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          sendResponse(result);
        } catch (error) {
          clearTimeout(timeoutId);
          const errorMessage = error.name === 'AbortError' 
            ? 'Request timeout' 
            : (error.message && error.message.includes('Backend server is not running')
              ? 'Backend server is not running. Please start it with: cd backend && python app.py'
              : error.message);
          sendResponse({ 
            safe: true, 
            reason: 'error', 
            message: errorMessage,
            error: true
          });
        }
      } catch (error) {
        sendResponse({ 
          safe: true, 
          reason: 'error', 
          message: error.message 
        });
      }
    })();
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_TAB_STATUS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const cached = checkedUrls.get(tabs[0].url);
        sendResponse(cached ? cached.result : null);
      } else {
        sendResponse(null);
      }
    });
    return true;
  }
});

// Clear old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [url, data] of checkedUrls.entries()) {
    if (now - data.timestamp > CACHE_DURATION) {
      checkedUrls.delete(url);
    }
  }
}, 60000); // Clean up every minute

// Check backend health on startup
async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend server is running:', data);
      return true;
    }
  } catch (error) {
    console.warn('⚠️ Backend server is not running or not reachable');
    console.warn('💡 To start the backend: cd backend && python app.py');
    console.warn('💡 Make sure the backend is running on http://127.0.0.1:5000');
    return false;
  }
  return false;
}

// Check backend on startup
checkBackendHealth();

console.log('🛡️ TrustNET AI background service worker initialized');
