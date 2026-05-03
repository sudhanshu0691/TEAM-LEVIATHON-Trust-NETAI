import React, { useEffect, useState } from 'react'

const AUTO_KEY = 'trustnet_ai_auto_check'
const WHITELIST_KEY = 'trustnet_ai_whitelist'
const NOTIFY_KEY = 'trustnet_ai_notifications'
const SCHEDULE_KEY = 'trustnet_ai_schedule'
const API_KEY = 'trustnet_ai_api_timeout'
const PERFORMANCE_KEY = 'trustnet_ai_performance'

export default function Settings(){
  const [auto, setAuto] = useState(true)
  const [whitelist, setWhitelist] = useState([])
  const [notifications, setNotifications] = useState(true)
  const [schedule, setSchedule] = useState(false)
  const [apiTimeout, setApiTimeout] = useState(10)
  const [performanceMode, setPerformanceMode] = useState('balanced')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(()=>{
    try{
      chrome.storage.local.get([
        AUTO_KEY, WHITELIST_KEY, NOTIFY_KEY, SCHEDULE_KEY, API_KEY, PERFORMANCE_KEY
      ], res=>{
        setAuto(res[AUTO_KEY] ?? true)
        setWhitelist(res[WHITELIST_KEY] || [])
        setNotifications(res[NOTIFY_KEY] ?? true)
        setSchedule(res[SCHEDULE_KEY] ?? false)
        setApiTimeout(res[API_KEY] ?? 10)
        setPerformanceMode(res[PERFORMANCE_KEY] ?? 'balanced')
      })
    }catch(e){
      console.warn('settings load', e)
    }
  },[])

  function toggleAuto(){
    const next = !auto
    setAuto(next)
    try{ chrome.storage.local.set({[AUTO_KEY]: next}) }catch(e){}
  }

  function toggleNotifications(){
    const next = !notifications
    setNotifications(next)
    try{ chrome.storage.local.set({[NOTIFY_KEY]: next}) }catch(e){}
  }

  function toggleSchedule(){
    const next = !schedule
    setSchedule(next)
    try{ chrome.storage.local.set({[SCHEDULE_KEY]: next}) }catch(e){}
  }

  function updateApiTimeout(value){
    setApiTimeout(value)
    try{ chrome.storage.local.set({[API_KEY]: value}) }catch(e){}
  }

  function updatePerformanceMode(mode){
    setPerformanceMode(mode)
    try{ chrome.storage.local.set({[PERFORMANCE_KEY]: mode}) }catch(e){}
  }

  function exportWhitelist(){
    const blob = new Blob([JSON.stringify(whitelist, null, 2)], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `safevisit-whitelist-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importWhitelist(){
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = e => {
      const file = e.target.files[0]
      if(!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        try{
          const data = JSON.parse(ev.target.result)
          if(Array.isArray(data)){
            chrome.storage.local.set({[WHITELIST_KEY]: data}, ()=>setWhitelist(data))
          }
        }catch(err){
          alert('Invalid JSON file')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  function clearWhitelist(){
    if(!confirm('Clear all whitelisted sites?')) return
    try{
      chrome.storage.local.set({[WHITELIST_KEY]: []}, ()=>setWhitelist([]))
    }catch(e){console.warn('clear whitelist', e)}
  }

  function resetAllSettings(){
    if(!confirm('Reset all settings to default? This cannot be undone.')) return
    try{
      chrome.storage.local.set({
        [AUTO_KEY]: true,
        [NOTIFY_KEY]: true,
        [SCHEDULE_KEY]: false,
        [API_KEY]: 10,
        [PERFORMANCE_KEY]: 'balanced'
      }, ()=>{
        setAuto(true)
        setNotifications(true)
        setSchedule(false)
        setApiTimeout(10)
        setPerformanceMode('balanced')
      })
    }catch(e){console.warn('reset settings', e)}
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-xl text-gray-800 mb-3">⚙️ Settings</h3>

      {/* Protection Settings */}
      <div className="bg-white rounded-xl p-4 shadow-md">
        <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
          <span>🛡️</span>
          <span>Protection Settings</span>
        </h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">Auto-Check Websites</div>
              <div className="text-xs text-gray-600">Automatically scan websites when you visit them</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={auto} 
                onChange={toggleAuto}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">Notifications</div>
              <div className="text-xs text-gray-600">Show alerts when threats are detected</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={notifications} 
                onChange={toggleNotifications}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">Scheduled Scans</div>
              <div className="text-xs text-gray-600">Periodically scan browsing history</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={schedule} 
                onChange={toggleSchedule}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Performance Settings */}
      <div className="bg-white rounded-xl p-4 shadow-md">
        <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
          <span>⚡</span>
          <span>Performance</span>
        </h4>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Scanning Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {value: 'fast', label: 'Fast', icon: '🚀', desc: 'Quick scan'},
                {value: 'balanced', label: 'Balanced', icon: '⚖️', desc: 'Recommended'},
                {value: 'thorough', label: 'Thorough', icon: '🔍', desc: 'Deep scan'}
              ].map(mode => (
                <button
                  key={mode.value}
                  onClick={() => updatePerformanceMode(mode.value)}
                  className={`p-2 rounded-lg text-center transition-all ${
                    performanceMode === mode.value
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-xl mb-1">{mode.icon}</div>
                  <div className="text-xs font-semibold">{mode.label}</div>
                  <div className="text-[10px] opacity-80">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              API Timeout: {apiTimeout}s
            </label>
            <input 
              type="range" 
              min="5" 
              max="30" 
              value={apiTimeout}
              onChange={e => updateApiTimeout(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Fast (5s)</span>
              <span>Safe (30s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Whitelist Management */}
      <div className="bg-white rounded-xl p-4 shadow-md">
        <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
          <span>✅</span>
          <span>Whitelist ({whitelist.length} sites)</span>
        </h4>
        <div className="flex gap-2">
          <button 
            className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-semibold shadow hover:shadow-md transition-all"
            onClick={importWhitelist}
          >
            📂 Import
          </button>
          <button 
            className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-semibold shadow hover:shadow-md transition-all"
            onClick={exportWhitelist}
          >
            📥 Export
          </button>
          <button 
            className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-semibold shadow hover:shadow-md transition-all"
            onClick={clearWhitelist}
          >
            🗑️ Clear
          </button>
        </div>
        <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
          💡 Tip: Add sites you trust to skip security checks
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-xl p-4 shadow-md">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-sm font-bold text-gray-700"
        >
          <span className="flex items-center gap-2">
            <span>🔧</span>
            <span>Advanced Settings</span>
          </span>
          <span className="text-gray-400">{showAdvanced ? '▼' : '▶'}</span>
        </button>
        
        {showAdvanced && (
          <div className="mt-3 space-y-2 pt-3 border-t">
            <button
              onClick={resetAllSettings}
              className="w-full px-3 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-sm font-semibold shadow hover:shadow-md transition-all"
            >
              🔄 Reset All Settings
            </button>
            
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Extension Version:</span>
                <span className="font-semibold">0.2.0</span>
              </div>
              <div className="flex justify-between">
                <span>Storage Used:</span>
                <span className="font-semibold">~{Math.ceil((JSON.stringify(whitelist).length / 1024))}KB</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-semibold">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* About Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-4 shadow-md text-white">
        <h4 className="font-bold text-sm mb-2">👋 About SafeVisit</h4>
        <p className="text-xs opacity-90 mb-3">
          Advanced web protection extension that keeps you safe from phishing, malware, and suspicious websites.
        </p>
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-xs font-semibold transition-all">
            📜 Documentation
          </button>
          <button className="flex-1 px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-xs font-semibold transition-all">
            🐛 Report Issue
          </button>
        </div>
      </div>
    </div>
  )
}
