import React, { useEffect, useState } from 'react'
import Alert from './Alert'
import Whitelist from './Whitelist'
import History from './History.jsx'
import Settings from './Settings.jsx'
import { getCurrentTabUrl, sendCheckRequest } from '../utils/apiHandler'

const HISTORY_KEY = 'trustnet_ai_history'
const STATS_KEY = 'trustnet_ai_stats'

export default function Popup(){
  const [url, setUrl] = useState('')
  const [inputUrl, setInputUrl] = useState('')
  const [result, setResult] = useState(null)
  const [tab, setTab] = useState('overview')
  const [showWhitelist, setShowWhitelist] = useState(false)
  const [stats, setStats] = useState({total: 0, safe: 0, unsafe: 0, blocked: 0})
  const [isProtected, setIsProtected] = useState(true)

  useEffect(()=>{
    loadStats()
    loadProtectionStatus()
    
    ;(async ()=>{
      console.log('🚀 [Popup] Initializing popup...')
      const u = await getCurrentTabUrl()
      console.log('📍 [Popup] Current tab URL fetched:', u)
      
      if(u) {
        setUrl(u)
        setInputUrl(u)
        
        // Check protection status and run check if enabled
        chrome.storage.local.get(['trustnet_ai_protection'], (res) => {
          const isEnabled = res.trustnet_ai_protection ?? true
          console.log('🔒 [Popup] Protection status:', isEnabled)
          
          if(isEnabled) {
            console.log('🔍 [Popup] Auto-checking current tab URL...')
            doCheck(u)
          } else {
            console.log('⚠️ [Popup] Protection is disabled, skipping auto-check')
          }
        })
      } else {
        console.warn('⚠️ [Popup] No URL found for current tab')
      }
    })()
  },[])


  function loadStats(){
    try{
      chrome.storage.local.get([STATS_KEY], res=>{
        setStats(res[STATS_KEY] || {total: 0, safe: 0, unsafe: 0, blocked: 0})
      })
    }catch(e){console.warn('loadStats', e)}
  }

  function loadProtectionStatus(){
    try{
      chrome.storage.local.get(['trustnet_ai_protection'], res=>{
        setIsProtected(res.trustnet_ai_protection ?? true)
      })
    }catch(e){console.warn('loadProtectionStatus', e)}
  }

  function updateStats(isSafe, wasBlocked = false){
    try{
      chrome.storage.local.get([STATS_KEY], res=>{
        const s = res[STATS_KEY] || {total: 0, safe: 0, unsafe: 0, blocked: 0}
        s.total++
        if(isSafe) s.safe++
        else s.unsafe++
        if(wasBlocked) s.blocked++
        chrome.storage.local.set({[STATS_KEY]: s})
        setStats(s)
      })
    }catch(e){console.warn('updateStats', e)}
  }

  async function doCheck(targetUrl){
    console.log('🔍 [Popup] Starting URL check for:', targetUrl)
    setResult({checking:true})
    try {
      const res = await sendCheckRequest(targetUrl)
      console.log('✅ [Popup] Backend Response:', {
        safe: res.safe,
        reason: res.reason,
        message: res.message,
        fullResponse: res
      })
      console.log('🎯 [Popup] Setting result state to:', {safe: res.safe, reason: res.reason})
      setResult(res)
      updateStats(!!res.safe)
      await pushHistory({url: targetUrl, safe: !!res.safe, reason: res.reason || 'none', ts: Date.now(), details: res})
    } catch(e) {
      console.error('❌ [Popup] Error during check:', e)
      setResult({
        safe: null,
        error: true,
        reason: 'popup_error',
        message: 'Error checking URL: ' + e.message
      })
    }
  }

  function pushHistory(item){
    return new Promise((resolve) => {
      try{
        chrome.storage.local.get([HISTORY_KEY], res=>{
          const list = res[HISTORY_KEY] || []
          list.unshift(item)
          const next = list.slice(0,50)
          chrome.storage.local.set({[HISTORY_KEY]: next}, ()=>{
            resolve()
          })
        })
      }catch(e){
        console.warn('pushHistory', e)
        resolve()
      }
    })
  }

  const onManualCheck = async ()=>{
    if(!inputUrl) return
    await doCheck(inputUrl)
    setUrl(inputUrl)
  }

  const toggleProtection = ()=>{
    const next = !isProtected
    setIsProtected(next)
    try{
      chrome.storage.local.set({trustnet_ai_protection: next})
    }catch(e){console.warn('toggleProtection', e)}
  }

  return (
    <div className="w-[420px] font-sans bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-[500px] p-4">
      {/* Header */}
      <header className="mb-4 animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">TrustNET AI</h1>
              <p className="text-xs text-gray-600">Advanced Web Protection</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleProtection}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                isProtected 
                  ? 'bg-green-500 text-white shadow-lg shadow-green-200' 
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {isProtected ? '🟢 Protected' : '🔴 Disabled'}
            </button>
            <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full shadow">v0.2</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-lg font-bold text-indigo-600">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs text-gray-500">Safe</div>
            <div className="text-lg font-bold text-green-600">{stats.safe}</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs text-gray-500">Threats</div>
            <div className="text-lg font-bold text-red-600">{stats.unsafe}</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs text-gray-500">Blocked</div>
            <div className="text-lg font-bold text-orange-600">{stats.blocked}</div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="flex gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm animate-slide-up">
        {[
          {id: 'overview', icon: '🏠', label: 'Overview'},
          {id: 'history', icon: '📊', label: 'History'},
          {id: 'settings', icon: '⚙️', label: 'Settings'}
        ].map(item => (
          <button 
            key={item.id}
            className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              tab === item.id 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`} 
            onClick={() => setTab(item.id)}
          >
            <span className="mr-1">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="animate-fade-in">
        {tab==='overview' && (
          <div className="space-y-3">
            {/* URL Checker */}
            <div className="bg-white rounded-xl p-4 shadow-md">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">🔍 Check Website URL</label>
              <div className="flex gap-2 mb-3">
                <input 
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors" 
                  value={inputUrl} 
                  onChange={e=>setInputUrl(e.target.value)}
                  placeholder="Enter URL to scan..."
                />
                <button 
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105" 
                  onClick={onManualCheck}
                >
                  Scan
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-gray-100 rounded-full">Current Tab</span>
                <code className="flex-1 truncate">{url || 'No active tab'}</code>
              </div>
            </div>

            {/* Result Display */}
            {result ? (
              result.checking ? (
                <div className="bg-white rounded-xl p-6 shadow-md text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
                  <div className="text-sm text-gray-600 mt-3">Analyzing URL security...</div>
                </div>
              ) : result.safe === false ? (
                <Alert url={url || inputUrl} reason={result.reason} details={result} onWhitelist={()=>setShowWhitelist(true)} />
              ) : result.safe === true ? (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-bold text-green-800 text-lg">Website is Safe</h3>
                      <p className="text-sm text-green-600">{result.message || 'No threats detected. You can proceed safely.'}</p>
                    </div>
                  </div>
                  {(result.source || result.reason) && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <div className="text-xs text-green-700 space-y-1">
                        <div className="flex justify-between">
                          <span>Detection Source:</span>
                          <span className="font-semibold">{result.source === 'local_dataset' ? '✓ Local Database' : result.source || result.reason}</span>
                        </div>
                        {result.match_type && (
                          <div className="flex justify-between">
                            <span>Match Type:</span>
                            <span className="font-semibold capitalize">{result.match_type.replace('_', ' ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : result.error ? (
                // Error state - show alert style
                <Alert url={url || inputUrl} reason={result.reason || 'error'} details={result} onWhitelist={()=>setShowWhitelist(true)} />
              ) : (
                // Fallback for unknown state
                <div className="bg-white rounded-xl p-4 shadow-md text-center text-gray-600">
                  <div className="text-sm">Unknown result state</div>
                  <pre className="text-xs mt-2 bg-gray-100 p-2 rounded text-left overflow-auto max-h-20">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-md text-center text-gray-500">
                <div className="text-4xl mb-2">🔒</div>
                <div className="text-sm">Enter a URL above to check its safety</div>
              </div>
            )}

            {showWhitelist && <Whitelist url={url} onClose={()=>setShowWhitelist(false)} />}
          </div>
        )}

        {tab==='history' && <History onStatsUpdate={loadStats} />}
        {tab==='settings' && <Settings />}
      </div>
    </div>
  )
}
