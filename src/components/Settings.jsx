import React, { useEffect, useState } from 'react'

const AUTO_KEY = 'trustnet_ai_auto_check'
const WHITELIST_KEY = 'trustnet_ai_whitelist'
const NOTIFY_KEY = 'trustnet_ai_notifications'
const SCHEDULE_KEY = 'trustnet_ai_schedule'

export default function Settings(){
  const [auto, setAuto] = useState(true)
  const [whitelist, setWhitelist] = useState([])
  const [notifications, setNotifications] = useState(true)
  const [schedule, setSchedule] = useState(false)

  useEffect(()=>{
    try{
      chrome.storage.local.get([
        AUTO_KEY, WHITELIST_KEY, NOTIFY_KEY, SCHEDULE_KEY
      ], res=>{
        setAuto(res[AUTO_KEY] ?? true)
        setWhitelist(res[WHITELIST_KEY] || [])
        setNotifications(res[NOTIFY_KEY] ?? true)
        setSchedule(res[SCHEDULE_KEY] ?? false)
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

  function exportWhitelist(){
    const blob = new Blob([JSON.stringify(whitelist, null, 2)], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trustnet-ai-whitelist-${new Date().toISOString().split('T')[0]}.json`
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
            const cleaned = Array.from(new Set(data.map(item => String(item).trim().toLowerCase()).filter(Boolean)))
            chrome.storage.local.set({[WHITELIST_KEY]: cleaned}, ()=>setWhitelist(cleaned))
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

  return (
    <div className="space-y-2.5 animate-fade-in overflow-y-auto max-h-[550px] pr-1">
      <h3 className="font-bold text-base text-gray-800 mb-2 flex items-center gap-2 sticky top-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-2">
        <span className="text-lg">⚙️</span>
        <span>Settings</span>
      </h3>

      {/* Protection Settings */}
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-all duration-300">
        <h4 className="font-bold text-xs text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <span>Protection</span>
        </h4>
        
        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 group">
            <div className="flex-1">
              <div className="text-xs font-bold text-gray-800 group-hover:text-gray-900">Auto-Check</div>
              <div className="text-xs text-gray-600 mt-0.5">Scan on visit</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-3">
              <input 
                type="checkbox" 
                checked={auto} 
                onChange={toggleAuto}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-300 peer-checked:bg-blue-600 shadow-md peer-checked:shadow-lg peer-checked:shadow-blue-400"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hover:from-purple-100 hover:to-pink-100 transition-all duration-300 group">
            <div className="flex-1">
              <div className="text-xs font-bold text-gray-800 group-hover:text-gray-900">Notifications</div>
              <div className="text-xs text-gray-600 mt-0.5">Show alerts</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-3">
              <input 
                type="checkbox" 
                checked={notifications} 
                onChange={toggleNotifications}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-300 peer-checked:bg-purple-600 shadow-md peer-checked:shadow-lg peer-checked:shadow-purple-400"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-all duration-300 group">
            <div className="flex-1">
              <div className="text-xs font-bold text-gray-800 group-hover:text-gray-900">Scheduled Scans</div>
              <div className="text-xs text-gray-600 mt-0.5">Periodic scans</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-3">
              <input 
                type="checkbox" 
                checked={schedule} 
                onChange={toggleSchedule}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-300 peer-checked:bg-green-600 shadow-md peer-checked:shadow-lg peer-checked:shadow-green-400"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Whitelist Management */}
      <div className="bg-gradient-to-br from-white to-green-50 rounded-xl p-4 shadow-lg border border-green-100 hover:shadow-xl transition-all duration-300">
        <h4 className="font-bold text-xs text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span>Whitelist ({whitelist.length})</span>
        </h4>
        <div className="flex gap-1.5 mb-2">
          <button 
            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0"
            onClick={importWhitelist}
          >
            📂 Import
          </button>
          <button 
            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0"
            onClick={exportWhitelist}
          >
            📥 Export
          </button>
          <button 
            className="flex-1 px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0"
            onClick={clearWhitelist}
          >
            🗑️ Clear
          </button>
        </div>
        <div className="p-2 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-200">
          💡 <span className="font-semibold">Tip:</span> Add trusted sites only
        </div>
      </div>

      {/* About Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl p-4 shadow-xl text-white border border-indigo-400 hover:shadow-2xl transition-all duration-300 group">
        <h4 className="font-bold text-xs mb-1.5 flex items-center gap-2">
          <span className="text-lg">👋</span>
          <span>About TrustNET AI</span>
        </h4>
        <p className="text-xs opacity-95 mb-2 leading-relaxed">
          Advanced web protection with AI-powered detection.
        </p>
        <div className="flex gap-1.5">
          <button className="flex-1 px-2 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-xs font-bold transition-all duration-300 backdrop-blur-sm">
            📜 Docs
          </button>
          <button className="flex-1 px-2 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-xs font-bold transition-all duration-300 backdrop-blur-sm">
            🐛 Report
          </button>
        </div>
      </div>
    </div>
  )
}
