import { useState } from 'react'
import { useCatalogArchives } from '../../hooks/useCatalogArchives'
import { setCatalogArchived } from '../../services/catalogArchiveService'
import { useAuth } from '../../hooks/useAuth'
export default function CatalogArchiveManager(){
 const user=useAuth(),query=useCatalogArchives()
 const [busy,setBusy]=useState(null),[error,setError]=useState('')
 async function restore(row){setBusy(row.item_id);setError('');try{await setCatalogArchived({...row.snapshot,id:row.item_id},false,user.id)}catch(e){setError(e.message)}finally{setBusy(null)}}
 return <section className="profile-card"><h2>Arsip katalog saya</h2><p>Arsip pribadi menyembunyikan item dari daftar aktif Anda. Data sumber tetap tersimpan.</p>
 {query.isLoading&&user&&<p role="status">Memuat arsip…</p>}{(query.error||error)&&<p role="alert">{error||query.error.message}</p>}
 {!query.isLoading&&!query.error&&!query.data?.length&&<p>Belum ada item diarsipkan.</p>}
 {query.data?.map(row=><article key={row.item_id}><h3>{row.snapshot?.name||'Item katalog'}</h3><p>{new Date(row.archived_at).toLocaleString('id-ID')}</p><button className="btn btn--outline" disabled={!!busy} onClick={()=>restore(row)}>{busy===row.item_id?'Memulihkan…':'Pulihkan item'}</button></article>)}</section>
}
