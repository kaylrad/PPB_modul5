import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth, currentUser } from '../../hooks/useAuth'
import { queryClient } from '../../config/queryClient'
import { getDraftRecords,cacheDraft,getImportableDeviceDrafts,importDeviceDrafts } from '../../utils/draftStorage'
import { listAccountDrafts,persistAccountDraft,mergeDraftRecords } from '../../services/accountDraftService'
import ConfirmModal from '../modals/ConfirmModal'
import { draftRestorePlan } from '../../utils/draftTrash'
export default function DraftManager({onNavigate,onCountChange}){
 const user=useAuth(),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[removing,setRemoving]=useState(null)
 const remote=useQuery({queryKey:['accountDrafts',user?.id],queryFn:()=>listAccountDrafts(user.id),enabled:!!user})
 const records=mergeDraftRecords(getDraftRecords(true),user?remote.data||[]:[])
 const importable=getImportableDeviceDrafts()
 const active=records.filter(r=>!r.archivedAt&&!r.trashedAt&&!r.restoredAt)
 const archived=records.filter(r=>r.archivedAt&&!r.trashedAt&&!r.restoredAt)
 const trash=records.filter(r=>r.trashedAt&&!r.restoredAt)
 useEffect(()=>onCountChange?.(active.length),[active.length,onCountChange])
 async function action(fn){setBusy(true);setMessage('');try{await fn();await queryClient.invalidateQueries({queryKey:['accountDrafts']});setRevision(n=>n+1);return true}catch(error){setMessage(error.message);return false}finally{setBusy(false)}}
 async function save(record){
  let saved=record
  if(user)saved=await persistAccountDraft(record,record.archivedAt||null,user.id)
  if(currentUser()?.id!==user?.id)throw new Error('Sesi akun berubah. Silakan muat ulang.')
  if(!cacheDraft(saved))throw new Error('Database diperbarui, tetapi cache perangkat gagal disimpan. Muat ulang untuk melihat data database.')
 }
 async function sync(){await action(async()=>{for(const record of getDraftRecords(true))await save(record);setMessage('Draft perangkat tersinkron ke database akun.')})}
 async function archive(record,value){await action(()=>save({...record,savedAt:new Date().toISOString(),archivedAt:value?new Date().toISOString():null}))}
 async function remove(){
  if(!removing)return
  if(await action(async()=>{await save({...removing,savedAt:new Date().toISOString(),trashedAt:new Date().toISOString()});setMessage('Draft dipindahkan ke Sampah draft.')}))setRemoving(null)
 }
 async function restoreTrash(record){
  await action(async()=>{
   const latest=mergeDraftRecords(getDraftRecords(true),user?await listAccountDrafts(user.id):[])
   for(const write of draftRestorePlan(record,latest))await save(write)
   setMessage(record.archivedAt?'Draft dikembalikan ke Arsip draft.':'Draft dipulihkan ke daftar aktif.')
  })
 }
 function open(record){if(!cacheDraft(record)){setMessage('Tidak dapat memulihkan draft ke perangkat.');return}onNavigate(record.id==='create'?'Create':'Edit',record.id==='create'?undefined:{id:record.id})}
 const title=d=>typeof d.formData?.name==='string'?d.formData.name:'Tanpa judul'
 return <div data-revision={revision}>
 <section className="profile-card"><h2>Draft saya</h2><p>{user?'Draft perangkat dari database dan browser ini.':'Draft tetap tersedia di perangkat saat koneksi database belum siap.'}</p>
 {!!importable.length&&<button className="btn btn--outline" disabled={busy} onClick={()=>{const count=importDeviceDrafts();setRevision(n=>n+1);setMessage(count+' draft perangkat dipulihkan. Sinkronkan untuk menyimpannya ke database.')}}>Pulihkan draft perangkat sebelumnya ({importable.length})</button>}
 {user&&<button className="btn btn--outline" disabled={busy||remote.isLoading} onClick={sync}>{busy?'Memproses…':'Sinkronkan draft ke database'}</button>}
 {remote.isLoading&&user&&<p role="status">Memuat draft database…</p>}
 {remote.error&&<div role="alert"><p>{remote.error.message}</p><button className="btn btn--outline" onClick={()=>remote.refetch()}>Coba lagi</button></div>}
 {message&&<p role="status">{message}</p>}
 {!active.length&&!remote.isLoading&&!remote.error&&<p>Belum ada draft aktif.</p>}
 {active.map(d=><article key={d.id}><h3>{title(d)}</h3><p>{d.savedAt?new Date(d.savedAt).toLocaleString('id-ID'):''}</p><p>{typeof d.formData?.description==='string'?d.formData.description:''}</p>
 <p>{d.source==='database'?'Tersimpan di database':'Versi perangkat; sinkronkan setelah perubahan'}</p>
 <div className="profile-record-actions"><button className="btn btn--outline" disabled={busy} onClick={()=>open(d)}>Buka draft</button><button className="btn btn--outline" disabled={busy} onClick={()=>archive(d,true)}>Arsipkan draft</button><button className="btn btn--danger" disabled={busy} onClick={()=>setRemoving(d)}>Delete draft</button></div></article>)}</section>
 <section className="profile-card"><h2>Arsip draft</h2><p>Draft diarsipkan tetap tersimpan dan dapat dipulihkan.</p>
 {!archived.length&&<p>Belum ada arsip draft.</p>}
 {archived.map(d=><article key={d.id}><h3>{title(d)}</h3><p>{d.archivedAt?new Date(d.archivedAt).toLocaleString('id-ID'):''}</p>
 <div className="profile-record-actions"><button className="btn btn--outline" disabled={busy} onClick={()=>archive(d,false)}>Pulihkan draft</button><button className="btn btn--danger" disabled={busy} onClick={()=>setRemoving(d)}>Delete arsip draft</button></div></article>)}</section>
 <section className="profile-card"><h2>Sampah draft</h2><p>Draft yang di-delete tetap tersimpan dan dapat dikembalikan ke daftar atau arsip asalnya.</p>
 {!trash.length&&<p>Belum ada draft di Sampah.</p>}
 {trash.map(d=><article key={d.id}><h3>{title(d)}</h3><p>{new Date(d.trashedAt).toLocaleString('id-ID')}</p><button className="btn btn--outline" disabled={busy} onClick={()=>restoreTrash(d)}>Pulihkan dari Sampah</button></article>)}</section>
 <ConfirmModal open={!!removing} title="Delete draft?" message={`“${removing?title(removing):''}” akan dipindahkan ke Sampah draft. Anda dapat memulihkannya dari Profile.`} confirmLabel="Delete" danger loading={busy} onConfirm={remove} onCancel={()=>{if(!busy)setRemoving(null)}}/>
 </div>
}
