import axios from 'axios'
import { hashUrl, extractHostname } from './hashUtil'

const BACKEND = 'http://127.0.0.1:5000'

export async function getCurrentTabUrl(){
  return new Promise((resolve)=>{
    try{
      chrome.tabs.query({active:true,currentWindow:true}, tabs=>{
        if(tabs && tabs[0] && tabs[0].url) {
          console.log('📍 [API] Current tab URL:', tabs[0].url)
          resolve(tabs[0].url)
        }
        else {
          console.warn('⚠️ [API] No active tab found')
          resolve(null)
        }
      })
    }catch(e){
      console.error('❌ [API] Error getting tab URL:', e)
      resolve(null)
    }
  })
}

export async function sendCheckRequest(url){
  const hashed = await hashUrl(url)
  const domain = extractHostname(url)
  
  console.log('📤 [API] Sending check request:', {url, domain, hashed})
  
  try{
    const resp = await axios.post(`${BACKEND}/check`, { 
      url: url,
      hashed_url: hashed, 
      domain: domain 
    }, {
      timeout: 10000 // 10 second timeout
    })
    
    console.log('📥 [API] Backend response received:', {
      safe: resp.data.safe,
      reason: resp.data.reason,
      message: resp.data.message,
      fullData: resp.data
    })
    
    return {
      ...resp.data,
      url: url,
      domain: domain,
      timestamp: new Date().toISOString()
    }
  }catch(e){
    console.error('❌ [API] Error:', {
      code: e.code,
      message: e.message,
      response: e.response?.data
    })
    
    // If backend is down, return error state
    if(e.code === 'ECONNREFUSED' || e.code === 'ERR_NETWORK'){
      console.warn('⚠️ [API] Backend server is offline')
      return { 
        safe: true, 
        reason: 'backend_offline',
        message: 'Backend server is not running. Please start the Flask backend.',
        error: true
      }
    }
    
    // For other errors, be safe and mark as inconclusive
    console.warn('⚠️ [API] Request failed, returning inconclusive')
    return { 
      safe: true, 
      reason: 'error',
      message: 'Error checking URL. Proceeding with caution.',
      error: true
    }
  }
}

export async function checkWhitelist(domain){
  return new Promise((resolve)=>{
    try{
      chrome.storage.local.get(['trustnet_ai_whitelist'], (res)=>{
        const whitelist = res.trustnet_ai_whitelist || []
        resolve(whitelist.includes(domain))
      })
    }catch(e){
      resolve(false)
    }
  })
}

export async function addToWhitelist(domain){
  return new Promise((resolve)=>{
    try{
      chrome.storage.local.get(['trustnet_ai_whitelist'], (res)=>{
        const whitelist = res.trustnet_ai_whitelist || []
        if(!whitelist.includes(domain)){
          whitelist.push(domain)
          chrome.storage.local.set({trustnet_ai_whitelist: whitelist}, ()=>{
            resolve(true)
          })
        }else{
          resolve(true)
        }
      })
    }catch(e){
      resolve(false)
    }
  })
}

export async function removeFromWhitelist(domain){
  return new Promise((resolve)=>{
    try{
      chrome.storage.local.get(['trustnet_ai_whitelist'], (res)=>{
        const whitelist = res.trustnet_ai_whitelist || []
        const updated = whitelist.filter(d => d !== domain)
        chrome.storage.local.set({trustnet_ai_whitelist: updated}, ()=>{
          resolve(true)
        })
      })
    }catch(e){
      resolve(false)
    }
  })
}
