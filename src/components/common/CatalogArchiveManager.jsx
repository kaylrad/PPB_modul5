import { useState } from 'react'
import { useCatalogArchives } from '../../hooks/useCatalogArchives'
import { setCatalogArchived,setCatalogArchiveTrashed } from '../../services/catalogArchiveService'
import { useAuth } from '../../hooks/useAuth'
import ConfirmModal from '../modals/ConfirmModal'
export default function CatalogArchiveManager(){
 const user=useAuth(),query=useCatalogArchives()
 const [busy,setBusy]=useState(null),[error,setError]=useState(''),[removing,setRemoving]=useState(null)
 const archived=(query.data||[]).filter(row=>!row.trashed_at),trash=(query.data||[]).filter(row=>row.trashed_at)
 async function run(id,fn){setBusy(id);setError('');try{await fn();return true}catch(e){setError(e.message);return false}finally{setBusy(null)}}
 const restore=row=>run(row.item_id,()=>setCatalogArchived({...row.snapshot,id:row.item_id},false,user.id))
 return <><section className="profile-card"><h2>Arsip katalog saya</h2><p>Arsip pribadi menyembunyikan item dari daftar aktif Anda. Data sumber tetap tersimpan.</p>
 {query.isLoading&&user&&<p role="status">Memuat arsip…</p>}{(query.error||error)&&<p role="alert">{error||query.error.message}</p>}
 {!query.isLoading&&!query.error&&!archived.length&&<p>Belum ada item diarsipkan.</p>}
 {archived.map(row=><article key={row.item_id}><h3>{row.snapshot?.name||'Item katalog'}</h3><p>{new Date(row.archived_at).toLocaleString('id-ID')}</p><div className="profile-record-actions"><button className="btn btn--outline" disabled={!!busy} onClick={()=>restore(row)}>{busy===row.item_id?'Memproses…':'Pulihkan item'}</button><button className="btn btn--danger" disabled={!!busy} onClick={()=>setRemoving(row)}>Delete arsip katalog</button></div></article>)}</section>
 <section className="profile-card"><h2>Sampah arsip katalog</h2><p>Item di Sampah tetap disembunyikan dari daftar aktif Anda.</p>
 {!query.isLoading&&!query.error&&!trash.length&&<p>Belum ada arsip katalog di Sampah.</p>}
 {trash.map(row=><article key={row.item_id}><h3>{row.snapshot?.name||'Item katalog'}</h3><button className="btn btn--outline" disabled={!!busy} onClick={()=>run(row.item_id,()=>setCatalogArchiveTrashed(row.item_id,false,user.id))}>Kembalikan ke arsip katalog</button></article>)}</section>
 <ConfirmModal open={!!removing} title="Delete arsip katalog?" message={`“${removing?.snapshot?.name||'Item katalog'}” akan dipindahkan ke Sampah arsip katalog dan dapat dipulihkan.`} confirmLabel="Delete" danger loading={!!busy} onCancel={()=>{if(!busy)setRemoving(null)}} onConfirm={async()=>{if(removing&&await run(removing.item_id,()=>setCatalogArchiveTrashed(removing.item_id,true,user.id)))setRemoving(null)}}/>
 </>
}
