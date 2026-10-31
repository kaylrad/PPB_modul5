// Reuse the browser identity. Concurrent callers share one initialization.
export function createGuestSessionInitializer(client,withLock=fn=>fn()){
 let pending=null
 return {
  ensure(){
   if(!pending)pending=withLock(async()=>{
    if(!client)throw new Error('Database profil belum dikonfigurasi.')
    const existing=await client.auth.getSession()
    if(existing.error)throw existing.error
    if(existing.data.session?.user)return existing.data.session.user
    const result=await client.auth.signInAnonymously()
    if(result.error)throw result.error
    if(!result.data.user)throw new Error('Sesi perangkat tidak dapat dibuat.')
    return result.data.user
   }).finally(()=>{pending=null})
   return pending
  },
 }
}
