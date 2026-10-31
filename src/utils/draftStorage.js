import { currentUser } from '../hooks/useAuth'
import { getUserIdentifier } from '../services/userService'
// ---------------------------------------------------------------------------
// draftStorage.js — auto-save / restore form drafts via localStorage.
//
// Drafts are keyed by a string id:
//   'create'              → the Create form
//   '<uuid>'              → the Edit form for a specific product
//
// Each draft is stored under  `gun_draft_<id>`  and its companion
// timestamp under  `gun_draft_<id>_ts`.
// ---------------------------------------------------------------------------

const PREFIX = 'gun_draft_'
const ownerPrefix = () => PREFIX + (currentUser()?.id || ('device_' + getUserIdentifier())) + '_'
const TS_SUFFIX = '_ts'

/**
 * Persist a draft object.
 * @param {Object} draftData — arbitrary JSON-serializable form state
 * @param {string} draftId   — 'create' or a product UUID
 * @returns {boolean} true on success
 */
export const saveDraft = (draftData, draftId = 'create') => {
  try {
    const key = `${ownerPrefix()}${draftId}`
    const ts = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify({ ...draftData, archivedAt: null, savedAt: ts }))
    localStorage.setItem(`${key}${TS_SUFFIX}`, ts)
    return true
  } catch {
    return false
  }
}

/**
 * Load a previously saved draft.
 * @returns {Object|null}
 */
const readStoredDraft = (draftId = 'create') => {
  try {
    const raw = localStorage.getItem(`${ownerPrefix()}${draftId}`)
    const legacy = !currentUser() ? localStorage.getItem(PREFIX + draftId) : null
    return raw ? JSON.parse(raw) : legacy ? JSON.parse(legacy) : null
  } catch {
    return null
  }
}

export const loadDraft = (id = 'create') => {
 const record=readStoredDraft(id)
 return record?.archivedAt ? null : record
}
export const cacheDraft = record => {
 try {
  const key=ownerPrefix()+record.id
  const existing=JSON.parse(localStorage.getItem(key)||'null')
  if(existing?.savedAt&&record.savedAt&&Date.parse(existing.savedAt)>Date.parse(record.savedAt))return true
  localStorage.setItem(key,JSON.stringify(record))
  localStorage.setItem(key+TS_SUFFIX,record.savedAt||new Date().toISOString())
  return true
 }catch{return false}
}
export const archiveLocalDraft = (id,archived=true) => {
 const record=readStoredDraft(id)
 if(!record)return false
 return cacheDraft({...record,id,archivedAt:archived?new Date().toISOString():null,savedAt:new Date().toISOString()})
}

/**
 * Remove a draft and its timestamp from storage.
 */
export const deleteDraft = (draftId = 'create') => archiveLocalDraft(draftId,true)

/**
 * Check whether a draft exists.
 */
export const hasDraft = (draftId = 'create') => {
  try {
    return loadDraft(draftId) !== null
  } catch {
    return false
  }
}

/**
 * Return the ISO-8601 timestamp string of the last save, or null.
 */
export const getDraftTimestamp = (draftId = 'create') => {
  try {
    return localStorage.getItem(`${ownerPrefix()}${draftId}${TS_SUFFIX}`)
  } catch {
    return null
  }
}

/**
 * Human-readable "time ago" label for a draft timestamp.
 */
export const formatDraftTime = (timestamp) => {
  if (!timestamp) return ''
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(timestamp).toLocaleDateString()
}

/**
 * Return all existing draft ids.
 */
const allStoredIds = () => {
  try {
    const owned = Object.keys(localStorage)
      .filter(k => k.startsWith(ownerPrefix()) && !k.endsWith(TS_SUFFIX))
      .map(k => k.slice(ownerPrefix().length))
    if (currentUser()) return owned
    const legacy = Object.keys(localStorage)
      .filter(k => /^gun_draft_(create|[0-9]+|[0-9a-f-]{36})$/.test(k))
      .map(k => k.slice(PREFIX.length))
    return [...new Set([...owned,...legacy])]
  } catch {
    return []
  }
}

export const getDraftRecords = (includeArchived=false) => allStoredIds()
 .map(id=>({...readStoredDraft(id),id,source:'local'}))
 .filter(record=>includeArchived||!record.archivedAt)
export const getAllDraftIds = () => getDraftRecords().map(record=>record.id)

/**
 * Remove every gun draft from storage.
 */
export const clearAllDrafts = () => {
  getAllDraftIds().forEach(deleteDraft)
}

// Device-only drafts are imported explicitly; another account's drafts are never copied.
export function getImportableDeviceDrafts(){
 if(!currentUser()?.is_anonymous)return []
 const prefix=PREFIX+'device_'+getUserIdentifier()+'_'
 const records=[]
 try{
  for(const key of Object.keys(localStorage)){
   let id
   if(key.startsWith(prefix)&&!key.endsWith(TS_SUFFIX))id=key.slice(prefix.length)
   else if(/^gun_draft_(create|[0-9]+|[0-9a-f-]{36})$/.test(key))id=key.slice(PREFIX.length)
   if(!id||localStorage.getItem(ownerPrefix()+id))continue
   const raw=JSON.parse(localStorage.getItem(key)||'null')
   if(raw)records.push({...raw,id})
  }
 }catch{return []}
 return [...new Map(records.map(r=>[r.id,r])).values()]
}
export function importDeviceDrafts(){
 let imported=0
 for(const record of getImportableDeviceDrafts())if(cacheDraft(record))imported++
 return imported
}
