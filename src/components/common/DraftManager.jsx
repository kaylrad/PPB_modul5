import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth, currentUser } from '../../hooks/useAuth'
import { queryClient } from '../../config/queryClient'
import { getDraftRecords,cacheDraft } from '../../utils/draftStorage'
import { listAccountDrafts,persistAccountDraft,mergeDraftRecords } from '../../services/accountDraftService'
export default function DraftManager({onNavigate,onCountChange}){
 const user=useAuth(),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const remote=useQuery({queryKey:['accountDrafts',user?.id],queryFn:()=>listAccountDrafts(user.id),enabled:!!user})
 const records=mergeDraftRecords(getDraftRecords(true),user?remote.data||[]:[])
 const active=records.filter(r=>!r.archivedAt),archived=records.filter(r=>r.archivedAt)
 useEffect(()=>onCountChange?.(active.length),[active.length,onCountChange])
 async function action(fn){setBusy(true);setMessage('');try{await fn();await queryClient.invalidateQueries({queryKey:['accountDrafts']});setRevision(n=>n+1)}catch(error){setMessage(error.message)}finally{setBusy(false)}}
 async function sync(){
  await action(async()=>{
   for(const record of getDraftRecords(true)){
    const saved=await persistAccountDraft(record,record.archivedAt||null,user.id)
    if(currentUser()?.id!==user.id)throw new Error('Sesi akun berubah. Silakan muat ulang.')
    if(!cacheDraft(saved))throw new Error('Sinkronisasi database berhasil; cache perangkat penuh.')
   }
   setMessage('Draft perangkat tersinkron ke database akun.')
  })
 }
 async function archive(record,value){
  await action(async()=>{
   const updated={...record,savedAt:new Date().toISOString(),archivedAt:value?new Date().toISOString():null}
   if(user)Object.assign(updated,await persistAccountDraft(updated,updated.archivedAt,user.id))
   if(currentUser()?.id!==user?.id)throw new Error('Sesi akun berubah. Silakan muat ulang.')
   if(!cacheDraft(updated))throw new Error('Database diperbarui, tetapi cache perangkat gagal disimpan. Muat ulang untuk melihat data database.')
  })
 }
 function open(record){
  if(!cacheDraft(record)){setMessage('Tidak dapat memulihkan draft ke perangkat.');return}
  onNavigate(record.id==='create'?'Create':'Edit',record.id==='create'?undefined:{id:record.id})
 }
 return <div data-revision={revision}>
 <section className="profile-card"><h2>Draft saya</h2><p>{user?'Draft akun dari database dan perangkat ini.':'Draft pada perangkat ini. Login untuk menyimpan ke database.'}</p>
 {user&&<button className="btn btn--outline" disabled={busy||remote.isLoading} onClick={sync}>{busy?'Memproses…':'Sinkronkan draft ke database'}</button>}
 {remote.isLoading&&user&&<p role="status">Memuat draft database…</p>}
 {remote.error&&<div role="alert"><p>{remote.error.message}</p><button className="btn btn--outline" onClick={()=>remote.refetch()}>Coba lagi</button></div>}
 {message&&<p role="status">{message}</p>}
 {!active.length&&!remote.isLoading&&<p>Belum ada draft aktif.</p>}
 {active.map(d=><article key={d.id}><h3>{typeof d.formData?.name==='string'?d.formData.name:'Tanpa judul'}</h3><p>{d.savedAt?new Date(d.savedAt).toLocaleString('id-ID'):''}</p><p>{typeof d.formData?.description==='string'?d.formData.description:''}</p>
 <p>{d.source==='database'?'Tersimpan di database':'Versi perangkat; sinkronkan setelah perubahan'}</p>
 <button className="btn btn--outline" disabled={busy} onClick={()=>open(d)}>Buka draft</button>
 <button className="btn btn--outline" disabled={busy} onClick={()=>archive(d,true)}>Arsipkan draft</button></article>)}</section>
 <section className="profile-card"><h2>Arsip draft</h2><p>Draft diarsipkan tetap tersimpan dan dapat dipulihkan.</p>
 {!archived.length&&<p>Belum ada arsip draft.</p>}
 {archived.map(d=><article key={d.id}><h3>{typeof d.formData?.name==='string'?d.formData.name:'Tanpa judul'}</h3><p>{d.archivedAt?new Date(d.archivedAt).toLocaleString('id-ID'):''}</p>
 <button className="btn btn--outline" disabled={busy} onClick={()=>archive(d,false)}>Pulihkan draft</button></article>)}</section></div>
}

