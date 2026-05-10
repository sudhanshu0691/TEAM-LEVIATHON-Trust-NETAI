import React, { useEffect, useState } from 'react'

const HISTORY_KEY = 'trustnet_ai_history'

export default function History({onStatsUpdate}){
  const [list, setList] = useState([])
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(()=>{
    load()
    // Listen for storage changes in other tabs/popups
    const handleStorageChange = (changes, areaName) => {
      if(areaName === 'local' && changes[HISTORY_KEY]) {
        setList(changes[HISTORY_KEY].newValue || [])
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  },[])

  function load(){
    try{
      chrome.storage.local.get([HISTORY_KEY], res=>{
        setList(res[HISTORY_KEY] || [])
      })
    }catch(e){
      console.warn('History load', e)
    }
  }

  function clearHistory(){
    if(!confirm('Are you sure you want to clear all history?')) return
    try{
      chrome.storage.local.set({[HISTORY_KEY]: []}, ()=>{
        setList([])
        if(onStatsUpdate) onStatsUpdate()
      })
    }catch(e){
      console.warn('clearHistory', e)
    }
  }

  function deleteItem(item){
    const updated = list.filter(it => it.ts !== item.ts)
    try{
      chrome.storage.local.set({[HISTORY_KEY]: updated}, ()=>{
        setList(updated)
        if(onStatsUpdate) onStatsUpdate()
      })
    }catch(e){
      console.warn('deleteItem', e)
    }
  }

  function exportJson(){
    const blob = new Blob([JSON.stringify(list, null, 2)], {type:'application/json'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trustnet-ai-history-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCSV(){
    const sanitizeCsvCell = (value) => {
      const text = String(value ?? '')
      return /^[=+\-@]/.test(text) ? `'${text}` : text
    }
    const headers = ['URL', 'Status', 'Reason', 'Timestamp']
    const rows = list.map(it => [
      sanitizeCsvCell(it.url),
      sanitizeCsvCell(it.safe ? 'Safe' : 'Unsafe'),
      sanitizeCsvCell(it.reason || 'N/A'),
      sanitizeCsvCell(new Date(it.ts).toLocaleString())
    ])
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], {type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trustnet-ai-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredList = list.filter(it => {
    const matchesFilter = filter === 'all' || (filter === 'safe' && it.safe) || (filter === 'unsafe' && !it.safe)
    const matchesSearch = !searchTerm || it.url.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const safeCount = list.filter(it => it.safe).length
  const unsafeCount = list.length - safeCount

  return (
    <div className="space-y-3 animate-fade-in max-h-[550px] flex flex-col overflow-hidden">
      {/* Header with Stats */}
      <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base text-gray-800 flex items-center gap-2">
            <span className="text-xl">📊</span>
            <span>Scan History</span>
          </h3>
          <div className="flex gap-1.5">
            <button
              onClick={exportCSV}
              className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-300"
            >
              CSV
            </button>
            <button
              onClick={exportJson}
              className="px-2 py-1 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all duration-300"
            >
              JSON
            </button>
            <button
              onClick={clearHistory}
              className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-300"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-2 rounded-lg text-center border border-indigo-200 hover:shadow-md transition-all duration-300">
            <div className="text-xs text-indigo-600 font-bold">Total</div>
            <div className="text-xl font-bold text-indigo-700">{list.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-2 rounded-lg text-center border border-green-200 hover:shadow-md transition-all duration-300">
            <div className="text-xs text-green-600 font-bold">Safe</div>
            <div className="text-xl font-bold text-green-700">{safeCount}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-2 rounded-lg text-center border border-red-200 hover:shadow-md transition-all duration-300">
            <div className="text-xs text-red-600 font-bold">Threats</div>
            <div className="text-xl font-bold text-red-700">{unsafeCount}</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-2">
          <input 
            type="text"
            placeholder="🔍 Search URLs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-all duration-300 text-xs"
          />
          <div className="flex gap-1.5">
            {['all', 'safe', 'unsafe'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                  filter === f
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-300 scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? '🌐 All' : f === 'safe' ? '✅ Safe' : '⚠️ Threats'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow-lg text-center text-gray-500 border border-gray-200">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-xs font-medium">
              {searchTerm ? 'No results found' : list.length === 0 ? 'No scans yet' : 'No items match the filter'}
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredList.map((it, idx) => (
              <li 
                key={idx} 
                className={`bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 hover:-translate-y-0.5 ${
                  it.safe ? 'border-green-500 hover:bg-green-50' : 'border-red-500 hover:bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{it.safe ? '✅' : '⚠️'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        it.safe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {it.safe ? 'SAFE' : 'THREAT'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-800 break-all font-medium mb-1">{it.url}</div>
                    <div className="text-xs text-gray-500 font-medium">{new Date(it.ts).toLocaleString()}</div>
                    {it.reason && it.reason !== 'none' && (
                      <div className="mt-1.5 p-1.5 bg-gray-50 rounded text-xs text-gray-600 border border-gray-200">
                        <span className="font-bold">Reason:</span> {it.reason}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteItem(it)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                    title="Delete this entry"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
