import { accountClient, requireAccount } from '../config/accountClient'
export async function listAccountDrafts(expectedOwnerId){
 const user=await requireAccount()
 if(expectedOwnerId&&user.id!==expectedOwnerId)throw new Error('Sesi akun berubah. Silakan muat ulang.')
 const rows=[],pageSize=200
 for(let offset=0;;offset+=pageSize){
  const {data,error}=await accountClient.from('account_drafts').select('*').eq('owner_id',user.id).order('updated_at',{ascending:false}).order('draft_id').range(offset,offset+pageSize-1)
  if(error)throw new Error(error.message)
  rows.push(...data)
  if(data.length<pageSize)break
 }
 return rows.map(row=>({...row.payload,id:row.draft_id,savedAt:row.updated_at,archivedAt:row.archived_at,source:'database'}))
}
export async function persistAccountDraft(record, archivedAt=record.archivedAt||null, expectedOwnerId){
 const user=await requireAccount(),id=String(record.id)
 if(expectedOwnerId&&user.id!==expectedOwnerId)throw new Error('Sesi akun berubah. Silakan muat ulang.')
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new Error('ID draft tidak valid.')
 const {id:_ignoredId,source:_ignoredSource,...payload}=record
 if(new TextEncoder().encode(JSON.stringify(payload)).length>1048576)throw new Error('Draft melebihi batas 1 MB. Gunakan URL gambar yang sudah diupload.')
 const updatedAt=record.savedAt||new Date().toISOString()
 if(!Number.isFinite(Date.parse(updatedAt))||(archivedAt&&!Number.isFinite(Date.parse(archivedAt)))||[record.trashedAt,record.restoredAt].some(value=>value&&!Number.isFinite(Date.parse(value))))throw new Error('Waktu draft tidak valid.')
 const {data,error}=await accountClient.rpc('save_account_draft',{
  p_draft_id:id,p_payload:payload,p_archived_at:archivedAt,p_updated_at:updatedAt,
 }).single()
 if(error)throw new Error(error.message)
 return {...data.payload,id:data.draft_id,savedAt:data.updated_at,archivedAt:data.archived_at,source:'database'}
}
export function mergeDraftRecords(local,remote){
 const records=new Map(remote.map(r=>[r.id,r]))
 for(const record of local){
  const existing=records.get(record.id)
  if(!existing||Date.parse(record.savedAt||0)>Date.parse(existing.savedAt||0))records.set(record.id,record)
 }
 return [...records.values()].sort((a,b)=>Date.parse(b.savedAt||0)-Date.parse(a.savedAt||0))
}

