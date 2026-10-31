import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { listArchivedReviews, restoreCatalogReview } from '../../services/catalogReviewService'
export default function ReviewArchiveManager(){
 const user=useAuth()
 const query=useQuery({queryKey:['archivedReviews',user?.id],queryFn:()=>listArchivedReviews(user.id),enabled:!!user})
 const [busy,setBusy]=useState(null),[error,setError]=useState('')
 async function restore(row){setBusy(row.id);setError('');try{await restoreCatalogReview(row.id)}catch(e){setError(e.message)}finally{setBusy(null)}}
 return <section className="profile-card"><h2>Arsip review saya</h2><p>Review yang dihapus disimpan di sini dan dapat dipulihkan.</p>
 {query.isLoading&&user&&<p role="status">Memuat arsip review…</p>}
 {(query.error||error)&&<p role="alert">{error||query.error.message}</p>}
 {!query.isLoading&&!query.error&&!query.data?.length&&<p>Belum ada review diarsipkan.</p>}
 {query.data?.map(row=><article key={row.id}><p>Item {row.item_id} · ★ {row.rating}</p><p>{row.comment}</p><button className="btn btn--outline" disabled={!!busy} onClick={()=>restore(row)}>{busy===row.id?'Memulihkan…':'Pulihkan review'}</button></article>)}</section>
}
