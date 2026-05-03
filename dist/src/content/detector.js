// Content script - detects unsafe sites and shows in-page warnings
(async function() {
  try {
    const url = window.location.href;
    
    // Skip internal pages
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
      return;
    }

    const domain = window.location.hostname;

    // Check if already whitelisted
    const isWhitelisted = await checkWhitelist(domain);
    if (isWhitelisted) {
      return;
    }

    // Check if protection is enabled
    const protectionEnabled = await checkProtectionStatus();
    if (!protectionEnabled) {
      return;
    }

    // Perform local content analysis
    const contentThreats = analyzePageContent();
    const jsThreats = analyzeJavaScriptBehavior();
    
    // If critical local threats detected, show warning immediately
    if (contentThreats.risk_score > 50 || jsThreats.risk_score > 50) {
      const localThreatData = {
        safe: false,
        reason: 'local_content_analysis',
        message: 'Suspicious content detected on this page',
        content_threats: contentThreats,
        js_threats: jsThreats
      };
      showWarningBanner(localThreatData);
    }

    // Hash URL for privacy
    const hashedUrl = await hashUrl(url);

    // Check URL safety with backend
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('http://127.0.0.1:5000/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: url,
          hashed_url: hashedUrl, 
          domain: domain,
          content_analysis: {
            content_threats: contentThreats,
            js_threats: jsThreats
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔐 TrustNET AI Backend Response:', data);

      // If site is unsafe, show warning banner
      if (data.safe === false) {
        console.log('🚨 Showing warning banner for unsafe URL:', domain);
        showWarningBanner(data);
      } else if (data.safe === true) {
        console.log('✅ URL is safe:', domain);
      } else {
        console.log('⚠️ Unknown safety status for:', domain, data);
      }
    } catch (error) {
      // Log error for debugging
      console.log('TrustNET AI detector error:', error.message);
  } catch (error) {
    console.log('TrustNET AI detector error:', error);
  }
})();

function analyzePageContent() {
  /**
   * Criterion 6: Content Inspection
   * Detects fake login forms, hidden fields, suspicious iframes, phishing templates
   */
  const threats = [];
  let risk_score = 0;
  
  try {
    // Check for password input fields
    const passwordFields = document.querySelectorAll('input[type="password"]');
    const emailFields = document.querySelectorAll('input[type="email"], input[name*="email"], input[name*="user"]');
    
    if (passwordFields.length > 0) {
      // Check if form submits to external domain
      passwordFields.forEach(field => {
        const form = field.closest('form');
        if (form) {
          const action = form.action;
          if (action && !action.includes(window.location.hostname)) {
            risk_score += 30;
            threats.push('Login form submits to external domain');
          }
        }
      });
      
      // Check for forms without HTTPS
      if (!window.location.protocol.startsWith('https')) {
        risk_score += 25;
        threats.push('Password field on non-HTTPS page');
      }
    }
    
    // Check for hidden form fields (potential data exfiltration)
    const hiddenFields = document.querySelectorAll('input[type="hidden"]');
    if (hiddenFields.length > 10) {
      risk_score += 15;
      threats.push(`Excessive hidden form fields (${hiddenFields.length})`);
    }
    
    // Check for suspicious iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const src = iframe.src;
      if (src) {
        // Cross-domain iframe
        if (!src.includes(window.location.hostname) && !src.startsWith('about:')) {
          risk_score += 10;
          threats.push('Cross-domain iframe detected');
        }
        
        // Hidden iframe
        const style = window.getComputedStyle(iframe);
        if (style.display === 'none' || style.visibility === 'hidden' || 
            parseInt(style.width) < 10 || parseInt(style.height) < 10) {
          risk_score += 20;
          threats.push('Hidden iframe detected (potential data exfiltration)');
        }
      }
    });
    
    // Check for fake login page indicators
    const pageText = document.body.innerText.toLowerCase();
    const urgentKeywords = ['account suspended', 'verify now', 'click here immediately', 
                           'urgent action required', 'account will be closed', 
                           'confirm your identity'];
    
    for (const keyword of urgentKeywords) {
      if (pageText.includes(keyword)) {
        risk_score += 15;
        threats.push(`Urgency-creating language detected: "${keyword}"`);
        break;
      }
    }
    
    // Check for suspicious external links
    const links = document.querySelectorAll('a[href]');
    let externalLinks = 0;
    links.forEach(link => {
      const href = link.href;
      if (href && !href.includes(window.location.hostname)) {
        externalLinks++;
      }
    });
    
    if (links.length > 0 && externalLinks / links.length > 0.8) {
      risk_score += 10;
      threats.push('Majority of links point to external sites');
    }
    
  } catch (error) {
    console.log('Content analysis error:', error);
  }
  
  return {
    risk_score: Math.min(risk_score, 100),
    threats: threats,
    threat_count: threats.length
  };
}

function analyzeJavaScriptBehavior() {
  /**
   * Criterion 5: JavaScript Behavior Analysis
   * Detects crypto-mining, keyloggers, hidden redirects, obfuscated code
   */
  const threats = [];
  let risk_score = 0;
  
  try {
    // Check all script tags
    const scripts = document.querySelectorAll('script');
    
    scripts.forEach(script => {
      const scriptContent = script.innerHTML;
      
      if (scriptContent) {
        // Check for obfuscated JavaScript
        const obfuscationIndicators = [
          /eval\(/gi,
          /atob\(/gi,
          /fromCharCode/gi,
          /\\x[0-9a-f]{2}/gi,
          /\\u[0-9a-f]{4}/gi,
          /_0x[0-9a-f]+/gi
        ];
        
        let obfuscationScore = 0;
        obfuscationIndicators.forEach(pattern => {
          const matches = scriptContent.match(pattern);
          if (matches && matches.length > 3) {
            obfuscationScore++;
          }
        });
        
        if (obfuscationScore >= 3) {
          risk_score += 25;
          threats.push('Heavily obfuscated JavaScript detected');
        }
        
        // Check for crypto-mining indicators
        const cryptoMiningKeywords = [
          'cryptonight', 'coinhive', 'crypto-loot', 'minero', 'webminer',
          'coinimp', 'miner', 'hashalot', 'cryptocpu'
        ];
        
        for (const keyword of cryptoMiningKeywords) {
          if (scriptContent.toLowerCase().includes(keyword)) {
            risk_score += 40;
            threats.push('Crypto-mining script detected');
            break;
          }
        }
        
        // Check for keylogger patterns
        const keyloggerPatterns = [
          /addEventListener\s*\(\s*['"]keypress['"]/gi,
          /addEventListener\s*\(\s*['"]keydown['"]/gi,
          /onkeypress\s*=/gi,
          /document\.onkeydown/gi
        ];
        
        let keyloggerMatches = 0;
        keyloggerPatterns.forEach(pattern => {
          if (pattern.test(scriptContent)) {
            keyloggerMatches++;
          }
        });
        
        if (keyloggerMatches >= 2 && scriptContent.includes('XMLHttpRequest')) {
          risk_score += 35;
          threats.push('Potential keylogger detected (keyboard monitoring + data transmission)');
        }
        
        // Check for automatic redirects
        const redirectPatterns = [
          /window\.location\s*=\s*['"][^'"]+['"]/gi,
          /window\.location\.href\s*=\s*['"][^'"]+['"]/gi,
          /window\.location\.replace/gi,
          /meta.*http-equiv.*refresh/gi
        ];
        
        redirectPatterns.forEach(pattern => {
          if (pattern.test(scriptContent)) {
            risk_score += 10;
            threats.push('Automatic redirect detected');
          }
        });
      }
      
      // Check external script sources
      if (script.src) {
        const src = script.src.toLowerCase();
        
        // Suspicious domains
        const suspiciousDomains = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz'];
        for (const tld of suspiciousDomains) {
          if (src.includes(tld)) {
            risk_score += 15;
            threats.push(`External script from suspicious domain: ${tld}`);
            break;
          }
        }
      }
    });
    
    // Check for clipboard hijacking
    if (typeof navigator.clipboard !== 'undefined') {
      // This is a simplified check - in reality, monitoring actual clipboard access is complex
      const clipboardScripts = Array.from(scripts).some(s => 
        s.innerHTML.includes('clipboard.writeText') || 
        s.innerHTML.includes('clipboard.readText')
      );
      
      if (clipboardScripts) {
        risk_score += 10;
        threats.push('Page accesses clipboard');
      }
    }
    
  } catch (error) {
    console.log('JS behavior analysis error:', error);
  }
  
  return {
    risk_score: Math.min(risk_score, 100),
    threats: threats,
    threat_count: threats.length
  };
}

async function hashUrl(url) {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkWhitelist(domain) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['trustnet_ai_whitelist'], (res) => {
        const whitelist = res.trustnet_ai_whitelist || [];
        resolve(whitelist.includes(domain));
      });
    } catch (e) {
      resolve(false);
    }
  });
}

async function checkProtectionStatus() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['trustnet_ai_protection'], (res) => {
        resolve(res.trustnet_ai_protection !== false); // Default to true
      });
    } catch (e) {
      resolve(true);
    }
  });
}

function showWarningBanner(data) {
  // Check if banner already exists
  if (document.getElementById('trustnet-ai-warning-banner')) {
    console.log('⚠️ Warning banner already exists');
    return;
  }

  console.log('🚨 Creating warning banner for threat:', data.reason);

  // Create warning banner
  const banner = document.createElement('div');
  banner.id = 'trustnet-ai-warning-banner';
  banner.style.cssText = `
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    top: 0 !important;
    z-index: 2147483647 !important;
    background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%) !important;
    border-bottom: 4px solid #7f1d1d !important;
    color: white !important;
    padding: 16px 20px !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    animation: slideDown 0.3s ease-out !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    width: 100% !important;
    height: auto !important;
    max-width: 100% !important;
    margin: 0 !important;
  `;

  const threatLevel = getThreatLevel(data);
  const icon = getThreatIcon(threatLevel);
  const isPhishing = (data.reason || '').toLowerCase().includes('phishing');
  const detectionSource = getDetectionSource(data);

  banner.innerHTML = `
    <style>
      @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      #trustnet-ai-warning-banner button {
        cursor: pointer !important;
        transition: all 0.2s !important;
      }
      #trustnet-ai-warning-banner button:hover {
        transform: scale(1.05) !important;
      }
    </style>
    <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 16px;">
      <div style="font-size: 32px; animation: pulse 2s infinite;">${icon}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">
          ${isPhishing ? '🚨 PHISHING ALERT: Known Malicious Website' : '⚠️ WARNING: Potentially Dangerous Website Detected'}
        </div>
        <div style="font-size: 14px; opacity: 0.95;">
          ${data.message || 'This website may be unsafe. Proceed with caution.'}
        </div>
        <div style="font-size: 12px; margin-top: 4px; opacity: 0.85;">
          Threat Level: <strong>${threatLevel.toUpperCase()}</strong> | 
          Detection: ${detectionSource}
        </div>
      </div>
      <div style="display: flex; gap: 8px; flex-shrink: 0; margin-left: auto;">
        <button id="trustnet-ai-leave" style="
          background: white !important;
          color: #dc2626 !important;
          border: none !important;
          padding: 10px 20px !important;
          border-radius: 6px !important;
          font-weight: bold !important;
          font-size: 14px !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
          cursor: pointer !important;
        ">
          🚫 Leave Site
        </button>
        <button id="trustnet-ai-proceed" style="
          background: rgba(255,255,255,0.2) !important;
          color: white !important;
          border: 2px solid white !important;
          padding: 10px 20px !important;
          border-radius: 6px !important;
          font-weight: bold !important;
          font-size: 14px !important;
          cursor: pointer !important;
        ">
          Continue Anyway
        </button>
        <button id="trustnet-ai-close" style="
          background: transparent !important;
          color: white !important;
          border: none !important;
          font-size: 24px !important;
          padding: 0 10px !important;
          cursor: pointer !important;
        ">
          ×
        </button>
      </div>
    </div>
  `;

  // Add to page - use documentElement to ensure it's at the very top
  try {
    document.documentElement.insertBefore(banner, document.documentElement.firstChild);
    console.log('✅ Warning banner added to page');
  } catch (e) {
    console.error('Failed to add banner:', e);
    // Fallback: append to body
    document.body.insertBefore(banner, document.body.firstChild);
  }

  // Add button event listeners with error handling
  setTimeout(() => {
    const leaveBtn = document.getElementById('trustnet-ai-leave');
    const proceedBtn = document.getElementById('trustnet-ai-proceed');
    const closeBtn = document.getElementById('trustnet-ai-close');

    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        console.log('🚫 User clicked Leave Site');
        window.location.href = 'about:blank';
      });
    }

    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        console.log('✓ User clicked Continue Anyway');
        banner.remove();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('× User closed warning');
        banner.remove();
      });
    }
  }, 0);
}

function getThreatLevel(data) {
  const reason = (data.reason || '').toLowerCase();
  if (reason.includes('google_safebrowsing') || reason.includes('malware') || reason.includes('phishing')) {
    return 'critical';
  }
  if (data.probability && data.probability > 0.8) {
    return 'critical';
  }
  if (data.risk_score && data.risk_score > 70) {
    return 'high';
  }
  return 'medium';
}

function getDetectionSource(data) {
  const reason = (data.reason || '').toLowerCase();
  
  if (reason.includes('local_dataset_phishing')) {
    return '📊 Found in Phishing Database';
  } else if (reason.includes('local_dataset_legitimate')) {
    return '✓ Found in Legitimate Database';
  } else if (reason.includes('google_safebrowsing')) {
    return '🔍 Google Safe Browsing';
  } else if (reason.includes('virustotal')) {
    return '🛡️ VirusTotal Check';
  } else if (reason.includes('ml_classification')) {
    return '🤖 AI Detection Model';
  } else if (reason.includes('ssl') || reason.includes('certificate')) {
    return '🔒 SSL Certificate Check';
  } else if (reason.includes('heuristic')) {
    return '📈 Heuristic Analysis';
  } else {
    return data.reason || 'Unknown Check';
  }
}

function getThreatIcon(level) {
  switch (level) {
    case 'critical': return '🚨';
    case 'high': return '⚠️';
    case 'medium': return '⚡';
    default: return '⚠️';
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UNSAFE_SITE_DETECTED') {
    showWarningBanner(message.data);
  }
});
