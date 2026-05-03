import React from 'react'
import { addToWhitelist } from '../utils/apiHandler'

export default function Alert({url, reason, onWhitelist, details}){
  const [showDetails, setShowDetails] = React.useState(false)
  const [threatLevel, setThreatLevel] = React.useState('high')
  const [threatTypes, setThreatTypes] = React.useState([])

  React.useEffect(() => {
    // Determine threat level and types based on reason and details
    const reasonLower = (reason || '').toLowerCase()
    const message = (details?.message || '').toLowerCase()
    const threatType = (details?.threat_type || '').toLowerCase()
    
    let types = []
    let level = 'high'
    
    // Analyze threat type - Check local_dataset_phishing FIRST
    if(reasonLower.includes('local_dataset_phishing')){
      level = 'critical'
      types.push('📊 Found in Phishing Database')
      types.push('Known Phishing URL')
    }
    else if(reasonLower.includes('google_safebrowsing') || threatType.includes('malware')){
      level = 'critical'
      types.push('Malware')
    }
    else if(reasonLower.includes('phish') || reasonLower.includes('social_engineering') || threatType.includes('social_engineering')){
      level = 'critical'
      types.push('Phishing')
    }
    else if(reasonLower.includes('heuristic') || reasonLower.includes('suspicious')){
      level = 'high'
      types.push('Suspicious Pattern')
    }
    else if(reasonLower.includes('ml_model') || reasonLower.includes('ml_classification')){
      const prob = details?.probability || 0
      level = prob > 0.8 ? 'critical' : 'high'
      types.push('AI Detection')
    }
    
    if(details?.suspicious_patterns && details.suspicious_patterns.length > 0){
      types = [...types, ...details.suspicious_patterns.slice(0, 3)]
    }
    
    if(types.length === 0){
      types = ['Unknown Threat']
    }
    
    setThreatLevel(level)
    setThreatTypes(types)
  }, [reason, details])

  const leaveSite = ()=>{
    chrome.tabs.query({active:true,currentWindow:true},tabs=>{
      if(tabs[0]) {
        // Close the tab
        chrome.tabs.remove(tabs[0].id)
        // Update blocked count
        chrome.storage.local.get(['trustnet_ai_stats'], res=>{
          const s = res.trustnet_ai_stats || {total: 0, safe: 0, unsafe: 0, blocked: 0}
          s.blocked++
          chrome.storage.local.set({trustnet_ai_stats: s})
        })
        window.close()
      }
    })
  }

  const ignoreOnce = ()=>{
    // Just close the popup, user can continue browsing
    window.close()
  }

  const handleAddToWhitelist = async ()=>{
    try {
      const domain = new URL(url).hostname
      await addToWhitelist(domain)
      if(onWhitelist) onWhitelist()
      window.close()
    } catch(e){
      console.error('Error adding to whitelist:', e)
      alert('Failed to add to whitelist')
    }
  }

  const getThreatConfig = () => {
    switch(threatLevel) {
      case 'critical':
        return {
          icon: '🚨',
          color: 'red',
          gradient: 'from-red-50 to-red-100',
          border: 'border-red-400',
          title: 'CRITICAL THREAT DETECTED',
          badge: 'bg-red-600 text-white',
          textColor: 'text-red-900',
          tagColor: 'bg-red-100 text-red-700 border-red-300'
        }
      case 'high':
        return {
          icon: '⚠️',
          color: 'orange',
          gradient: 'from-orange-50 to-orange-100',
          border: 'border-orange-400',
          title: 'High Risk Website',
          badge: 'bg-orange-600 text-white',
          textColor: 'text-orange-900',
          tagColor: 'bg-orange-100 text-orange-700 border-orange-300'
        }
      case 'medium':
        return {
          icon: '⚡',
          color: 'yellow',
          gradient: 'from-yellow-50 to-yellow-100',
          border: 'border-yellow-400',
          title: 'Suspicious Activity Detected',
          badge: 'bg-yellow-600 text-white',
          textColor: 'text-yellow-900',
          tagColor: 'bg-yellow-100 text-yellow-700 border-yellow-300'
        }
      default:
        return {
          icon: '⚠️',
          color: 'orange',
          gradient: 'from-orange-50 to-orange-100',
          border: 'border-orange-400',
          title: 'Potentially Unsafe Website',
          badge: 'bg-orange-600 text-white',
          textColor: 'text-orange-900',
          tagColor: 'bg-orange-100 text-orange-700 border-orange-300'
        }
    }
  }

  const config = getThreatConfig()

  return (
    <div className={`bg-gradient-to-br ${config.gradient} border-4 ${config.border} rounded-xl p-5 shadow-2xl animate-slide-up`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-16 h-16 ${config.badge} rounded-full flex items-center justify-center text-4xl shadow-2xl flex-shrink-0 animate-pulse-slow`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className={`font-bold ${config.textColor} text-xl`}>{config.title}</h2>
            <span className={`px-3 py-1 ${config.badge} text-xs rounded-full uppercase font-bold`}>
              {threatLevel}
            </span>
          </div>
          <p className={`text-base ${config.textColor} font-medium opacity-90`}>
            {details?.message || reason || 'This website may be unsafe'}
          </p>
        </div>
      </div>

      {/* Threat Categories */}
      {threatTypes.length > 0 && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow-md border-2 border-gray-200">
          <div className="text-sm font-bold text-gray-800 mb-3">🔍 Detected Issues:</div>
          <div className="flex flex-wrap gap-2">
            {threatTypes.map((threat, idx) => (
              <span key={idx} className={`px-3 py-2 ${config.tagColor} text-sm rounded-lg font-semibold border-2`}>
                {threat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Risk Score */}
      {details?.risk_score && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow-md border-2 border-gray-200">
          <div className="text-sm font-bold text-gray-800 mb-3">⚡ Risk Score:</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-300 rounded-full h-3">
              <div 
                className={`bg-${config.color}-600 h-3 rounded-full transition-all duration-500`}
                style={{width: `${Math.min(details.risk_score, 100)}%`}}
              ></div>
            </div>
            <span className={`text-lg font-bold ${config.textColor}`}>{details.risk_score}/100</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-3">
          <button 
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 text-lg"
            onClick={leaveSite}
          >
            <span>🚫</span>
            <span>Leave Site Now</span>
          </button>
          <button 
            className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 text-base"
            onClick={ignoreOnce}
          >
            <span>👁️</span>
            <span>Ignore Once</span>
          </button>
        </div>
        <div className="flex gap-3">
          <button 
            className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 text-base"
            onClick={handleAddToWhitelist}
          >
            ✓ Add to Whitelist
          </button>
          <button 
            className="px-4 py-3 bg-white hover:bg-gray-50 border-2 border-gray-400 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 text-base text-gray-700"
            onClick={()=>setShowDetails(s=>!s)}
          >
            {showDetails ? '▲ Hide Details' : '▼ Show Details'}
          </button>
        </div>
      </div>

      {showDetails && details && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow-md border-2 border-gray-200">
          <div className="text-sm font-bold text-gray-800 mb-3">📋 Technical Details:</div>
          <pre className="text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap bg-gray-100 p-3 rounded border border-gray-300">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}

      {/* Security Tip */}
      <div className={`p-4 bg-white rounded-lg text-sm text-gray-700 border-l-4 border-${config.color}-500 font-semibold`}>
        <span>💡 Security Tip:</span> Never enter passwords or financial information on suspicious websites. Always verify the URL before proceeding.
      </div>
    </div>
  )
}
