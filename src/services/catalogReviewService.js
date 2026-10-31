import { accountClient,requireAccount } from '../config/accountClient'
import { queryClient } from '../config/queryClient'
import legacyService from './reviewService'
const invalidate=()=>Promise.all([queryClient.invalidateQueries({queryKey:['catalogReviews']}),queryClient.invalidateQueries({queryKey:['archivedReviews']})])
function validate(data){
 const rating=Number(data.rating),comment=String(data.comment||'').trim()
 if(!Number.isInteger(rating)||rating<1||rating>5||comment.length>500)throw new Error('Rating harus 1–5; komentar maksimal 500 karakter.')
 return {rating,comment}
}
export async function listCatalogReviews(itemId){
 if(!accountClient)throw new Error('Database review belum dikonfigurasi.')
 const {data,error}=await accountClient.from('catalog_reviews').select('*,catalog_review_votes(user_id,value)').eq('item_id',String(itemId)).is('deleted_at',null).order('created_at',{ascending:false})
 if(error)throw new Error(error.message)
 return data
}
export async function listLegacyReviews(itemId){
 try{const response=await legacyService.getReviews(itemId);if(response.success===false)throw new Error(response.message||'Review server praktikum tidak tersedia.');return {data:response.data||[],error:null}}
 catch(error){return {data:[],error:error.message||'Review server praktikum tidak tersedia.'}}
}
export async function createCatalogReview(itemId,data){
 const user=await requireAccount()
 if(itemId===null||itemId===undefined||!/^[a-zA-Z0-9_-]{1,100}$/.test(String(itemId))||String(itemId).startsWith('local-'))throw new Error('Review membutuhkan ID item dari API.')
 const {data:row,error}=await accountClient.from('catalog_reviews').insert({...validate(data),user_id:user.id,item_id:String(itemId)}).select().single()
 if(error)throw new Error(error.code==='23505'?'Anda sudah memiliki review untuk item ini. Gunakan Edit review.':error.message)
 await invalidate();return row
}
export async function updateCatalogReview(id,data){
 const user=await requireAccount()
 const {error}=await accountClient.from('catalog_reviews').update({...validate(data),updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).is('deleted_at',null).select().single()
 if(error)throw new Error(error.message)
 await invalidate()
}
export async function deleteCatalogReview(id){
 const user=await requireAccount()
 const {error}=await accountClient.from('catalog_reviews').update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).is('deleted_at',null).select().single()
 if(error)throw new Error(error.message)
 await invalidate()
}
export async function voteCatalogReview(review,value,currentValue){
 const user=await requireAccount()
 if(review.user_id===user.id)throw new Error('Anda tidak dapat menilai review sendiri.')
 if(![1,-1].includes(value))throw new Error('Nilai vote tidak valid.')
 const {error}=await accountClient.from('catalog_review_votes').upsert({review_id:review.id,user_id:user.id,value:currentValue===value?0:value})
 if(error)throw new Error(error.message)
 await invalidate()
}

export async function listArchivedReviews(expectedOwnerId){
 const user=await requireAccount()
 if(expectedOwnerId&&user.id!==expectedOwnerId)throw new Error('Sesi perangkat berubah.')
 const {data,error}=await accountClient.from('catalog_reviews').select('id,item_id,rating,comment,deleted_at,trashed_at').eq('user_id',user.id).not('deleted_at','is',null).order('deleted_at',{ascending:false})
 if(error)throw new Error(error.message)
 return data
}
export async function restoreCatalogReview(id){
 const user=await requireAccount()
 const {error}=await accountClient.from('catalog_reviews').update({deleted_at:null,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).not('deleted_at','is',null).is('trashed_at',null).select().single()
 if(error)throw new Error(error.code==='23505'?'Anda sudah mempunyai review aktif pada item yang sama. Arsipkan review aktif sebelum memulihkan review ini.':error.message)
 await invalidate()
}

export async function setReviewArchiveTrashed(id,trashed){
 const user=await requireAccount()
 const {error}=await accountClient.from('catalog_reviews').update({trashed_at:trashed?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).not('deleted_at','is',null).select().single()
 if(error)throw new Error(error.message)
 await invalidate()
}
