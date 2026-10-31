import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { listArchivedReviews, restoreCatalogReview,setReviewArchiveTrashed } from '../../services/catalogReviewService'
import ConfirmModal from '../modals/ConfirmModal'
export default function ReviewArchiveManager(){
 const user=useAuth()
 const query=useQuery({queryKey:['archivedReviews',user?.id],queryFn:()=>listArchivedReviews(user.id),enabled:!!user})
 const [busy,setBusy]=useState(null),[error,setError]=useState(''),[removing,setRemoving]=useState(null)
 const archived=(query.data||[]).filter(row=>!row.trashed_at),trash=(query.data||[]).filter(row=>row.trashed_at)
 async function run(id,fn){setBusy(id);setError('');try{await fn();return true}catch(e){setError(e.message);return false}finally{setBusy(null)}}
 return <><section className="profile-card"><h2>Arsip review saya</h2><p>Review yang dihapus disimpan di sini dan dapat dipulihkan.</p>
 {query.isLoading&&user&&<p role="status">Memuat arsip review…</p>}
 {(query.error||error)&&<p role="alert">{error||query.error.message}</p>}
 {!query.isLoading&&!query.error&&!archived.length&&<p>Belum ada review diarsipkan.</p>}
 {archived.map(row=><article key={row.id}><p>Item {row.item_id} · ★ {row.rating}</p><p>{row.comment}</p><div className="profile-record-actions"><button className="btn btn--outline" disabled={!!busy} onClick={()=>run(row.id,()=>restoreCatalogReview(row.id))}>{busy===row.id?'Memproses…':'Pulihkan review'}</button><button className="btn btn--danger" disabled={!!busy} onClick={()=>setRemoving(row)}>Delete arsip review</button></div></article>)}</section>
 <section className="profile-card"><h2>Sampah arsip review</h2><p>Pulihkan review ke arsip sebelum menerbitkannya kembali.</p>
 {!query.isLoading&&!query.error&&!trash.length&&<p>Belum ada arsip review di Sampah.</p>}
 {trash.map(row=><article key={row.id}><p>Item {row.item_id} · ★ {row.rating}</p><p>{row.comment}</p><button className="btn btn--outline" disabled={!!busy} onClick={()=>run(row.id,()=>setReviewArchiveTrashed(row.id,false))}>Kembalikan ke arsip review</button></article>)}</section>
 <ConfirmModal open={!!removing} title="Delete arsip review?" message="Review akan dipindahkan ke Sampah arsip review dan dapat dipulihkan." confirmLabel="Delete" danger loading={!!busy} onCancel={()=>{if(!busy)setRemoving(null)}} onConfirm={async()=>{if(removing&&await run(removing.id,()=>setReviewArchiveTrashed(removing.id,true)))setRemoving(null)}}/>
 </>
}
