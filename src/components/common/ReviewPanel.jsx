import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { listCatalogReviews,listLegacyReviews,createCatalogReview,updateCatalogReview,deleteCatalogReview,voteCatalogReview } from '../../services/catalogReviewService'
import ConfirmModal from '../modals/ConfirmModal'
export default function ReviewPanel({itemId}){
 const user=useAuth(),valid=!!itemId&&!String(itemId).startsWith('local-')
 const query=useQuery({queryKey:['catalogReviews',String(itemId)],queryFn:()=>listCatalogReviews(itemId),enabled:valid})
 const legacy=useQuery({queryKey:['legacyReviews',String(itemId)],queryFn:()=>listLegacyReviews(itemId),enabled:valid})
 const [rating,setRating]=useState(5),[comment,setComment]=useState(''),[editing,setEditing]=useState(null),[removing,setRemoving]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function run(fn){setBusy(true);setMessage('');try{await fn();return true}catch(e){setMessage(e.message);return false}finally{setBusy(false)}}
 async function submit(e){e.preventDefault();if(await run(()=>editing?updateCatalogReview(editing,{rating,comment}):createCatalogReview(itemId,{rating,comment}))){setEditing(null);setRating(5);setComment('');setMessage('Review tersimpan.')}}
 const reviews=query.data||[],average=reviews.length?reviews.reduce((sum,r)=>sum+r.rating,0)/reviews.length:0
 return <section className="detail-section"><h2>Review dan rating</h2>
 <p>{reviews.length} review · rata-rata {average.toFixed(1)} / 5</p>
 {!valid?<p>Review tersedia untuk item dari API.</p>:<form className="review-form" onSubmit={submit}>
 <label>Rating<select className="form-select" value={rating} onChange={e=>setRating(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} bintang</option>)}</select></label>
 <label>Komentar<textarea className="form-textarea" maxLength={500} value={comment} onChange={e=>setComment(e.target.value)}/></label>
 <button className="btn btn--primary" disabled={!user||busy}>{busy?'Memproses…':editing?'Simpan review':'Kirim review'}</button>
 {editing&&<button type="button" className="btn btn--outline" onClick={()=>{setEditing(null);setComment('');setRating(5)}}>Batal edit</button>}</form>}
 {message&&<p role="status">{message}</p>}{query.error&&<p role="alert">{query.error.message}</p>}
 {query.isLoading&&valid&&<p>Memuat review…</p>}{!query.isLoading&&!query.error&&!reviews.length&&<p>Belum ada review baru.</p>}
 <ul className="review-list">{reviews.map(r=>{
  const own=r.user_id===user?.id,votes=r.catalog_review_votes||[],current=votes.find(v=>v.user_id===user?.id)?.value||0
  return <li className="review-item" key={r.id}><strong>{own?'Anda':'Pengunjung '+r.user_id.slice(0,6)}</strong><p>★ {r.rating}</p><p>{r.comment}</p>
  {own?<><button className="btn btn--outline" disabled={busy} onClick={()=>{setEditing(r.id);setRating(r.rating);setComment(r.comment)}}>Edit review</button><button className="btn btn--outline" disabled={busy} onClick={()=>setRemoving(r.id)}>Hapus review</button></>:
  <>{[1,-1].map(v=><button key={v} className="btn btn--outline" disabled={!user||busy} aria-label={v===1?'Thumbs up':'Thumbs down'} aria-pressed={current===v} onClick={()=>run(()=>voteCatalogReview(r,v,current))}>{v===1?'👍':'👎'} {votes.filter(x=>x.value===v).length}</button>)}</>}</li>
 })}</ul>
 {!!legacy.data?.data.length&&<section><h3>Review server praktikum</h3><p>Review lama tetap ditampilkan sebagai data baca-saja karena pemilik identitas lamanya tidak dapat diverifikasi.</p>{legacy.data.data.map((r,i)=><article className="review-item" key={String(r.id)+'-'+i}><strong>{r.user_identifier||'Pengunjung'}</strong><p>★ {r.rating}</p><p>{r.comment}</p></article>)}</section>}
 {legacy.data?.error&&<p role="status">{legacy.data.error}</p>}
 <ConfirmModal open={!!removing} title="Hapus review?" message="Review akan dipindahkan ke Profile → Arsip review saya dan dapat dipulihkan." confirmLabel="Hapus review" loading={busy} onCancel={()=>setRemoving(null)}
 onConfirm={async()=>{if(await run(()=>deleteCatalogReview(removing))){setRemoving(null);setEditing(null);setComment('')}}}/></section>
}
