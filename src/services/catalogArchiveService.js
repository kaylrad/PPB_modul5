import { accountClient,requireAccount } from '../config/accountClient'
import { queryClient } from '../config/queryClient'
export async function listCatalogArchives(expectedOwnerId){
 const user=await requireAccount()
 if(expectedOwnerId&&user.id!==expectedOwnerId)throw new Error('Sesi perangkat berubah.')
 const {data,error}=await accountClient.from('catalog_archives').select('*').eq('owner_id',user.id).not('archived_at','is',null).order('archived_at',{ascending:false})
 if(error)throw new Error(error.message)
 return data
}
export async function setCatalogArchived(item,archived=true,expectedOwnerId){
 const user=await requireAccount()
 if(expectedOwnerId&&user.id!==expectedOwnerId)throw new Error('Sesi perangkat berubah.')
 if(item?.id===undefined||item?.id===null)throw new Error('ID item tidak valid.')
 const itemId=String(item.id)
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(itemId))throw new Error('ID item tidak valid.')
 const snapshot={}
 for(const key of ['name','type','caliber','price','description','image_url','image'])if(item[key]!==undefined)snapshot[key]=item[key]
 const {error}=await accountClient.from('catalog_archives').upsert({owner_id:user.id,item_id:itemId,snapshot,archived_at:archived?new Date().toISOString():null,trashed_at:null})
 if(error)throw new Error(error.message)
 await queryClient.invalidateQueries({queryKey:['catalogArchives',user.id]})
}

export async function setCatalogArchiveTrashed(itemId,trashed,expectedOwnerId){
 const user=await requireAccount()
 if(expectedOwnerId&&user.id!==expectedOwnerId)throw new Error('Sesi perangkat berubah.')
 const {error}=await accountClient.from('catalog_archives').update({trashed_at:trashed?new Date().toISOString():null}).eq('owner_id',user.id).eq('item_id',String(itemId)).not('archived_at','is',null).select().single()
 if(error)throw new Error(error.message)
 await queryClient.invalidateQueries({queryKey:['catalogArchives',user.id]})
}
