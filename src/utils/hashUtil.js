// hashUtil.js - produce SHA-256 of URL for privacy
export async function hashUrl(url){
  const enc = new TextEncoder()
  const data = enc.encode(url)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b=>b.toString(16).padStart(2,'0')).join('')
  return hashHex
}

export function extractHostname(url){
  try{
    return new URL(url).hostname
  }catch(e){
    return url
  }
}
