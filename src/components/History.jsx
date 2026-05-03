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
    const headers = ['URL', 'Status', 'Reason', 'Timestamp']
    const rows = list.map(it => [
      it.url,
      it.safe ? 'Safe' : 'Unsafe',
      it.reason || 'N/A',
      new Date(it.ts).toLocaleString()
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
    <div className="space-y-3">
      {/* Header with Stats */}
      <div className="bg-white rounded-xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-800">📊 Scan History</h3>
          <div className="flex gap-2">

          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-2 rounded-lg text-center">
            <div className="text-xs text-indigo-600 font-medium">Total Scans</div>
            <div className="text-xl font-bold text-indigo-700">{list.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-2 rounded-lg text-center">
            <div className="text-xs text-green-600 font-medium">Safe Sites</div>
            <div className="text-xl font-bold text-green-700">{safeCount}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-2 rounded-lg text-center">
            <div className="text-xs text-red-600 font-medium">Threats</div>
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
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
          />
          <div className="flex gap-2">
            {['all', 'safe', 'unsafe'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
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
      <div className="max-h-[320px] overflow-y-auto space-y-2">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow-md text-center text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <div className="text-sm">
              {searchTerm ? 'No results found' : list.length === 0 ? 'No scans yet' : 'No items match the filter'}
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredList.map((it, idx) => (
              <li key={idx} className={`bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all border-l-4 ${
                it.safe ? 'border-green-500' : 'border-red-500'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{it.safe ? '✅' : '⚠️'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        it.safe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {it.safe ? 'SAFE' : 'THREAT'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 break-all font-medium mb-1">{it.url}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(it.ts).toLocaleString()}
                    </div>
                    {it.reason && it.reason !== 'none' && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <span className="font-semibold">Reason:</span> {it.reason}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteItem(it)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
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
