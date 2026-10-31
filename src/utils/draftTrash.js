import { makeDraftTrashCopy } from './draftStorage'
export function draftRestorePlan(record,records){
 const latest=records.find(r=>r.id===record.id)
 if(latest&&(latest.restoredAt||!latest.trashedAt||Date.parse(latest.savedAt)>Date.parse(record.savedAt)))throw new Error('Draft sudah berubah. Muat ulang Profile sebelum memulihkan.')
 const targetId=record.originalDraftId||record.id
 const target=records.find(r=>r.id===targetId)
 if(targetId!==record.id&&target&&!target.trashedAt&&!target.restoredAt)throw new Error('Masih ada draft pada form yang sama. Pindahkan draft tersebut ke Sampah sebelum memulihkan versi ini.')
 const writes=[]
 if(targetId!==record.id&&target?.trashedAt&&!target.restoredAt)writes.push(makeDraftTrashCopy(target))
 const now=new Date().toISOString()
 writes.push({...record,id:targetId,trashedAt:null,restoredAt:null,originalDraftId:undefined,savedAt:now})
 if(targetId!==record.id)writes.push({...record,restoredAt:now,savedAt:now})
 return writes
}
