import { useSyncExternalStore } from 'react'
import { accountClient,ensureGuestSession } from '../config/accountClient'
import { queryClient } from '../config/queryClient'
let state={user:null,loading:!!accountClient,error:accountClient?null:'Database profil belum dikonfigurasi.'}
const listeners=new Set()
const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn)}
function publish(next){
 if(state.user?.id!==next.user?.id)queryClient.clear()
 state=next;listeners.forEach(fn=>fn())
}
accountClient?.auth.onAuthStateChange((_event,session)=>{
 if(session?.user)publish({user:session.user,loading:false,error:null})
 else if(state.user)publish({user:null,loading:false,error:'Sesi perangkat berakhir. Hubungkan kembali untuk melanjutkan.'})
})
export async function retryGuestSession(){
 publish({...state,loading:true,error:null})
 try{const user=await ensureGuestSession();publish({user,loading:false,error:null})}
 catch(error){publish({user:null,loading:false,error:error.message||'Tidak dapat menghubungkan profil perangkat.'})}
}
if(typeof window!=='undefined')void retryGuestSession()
export const currentUser=()=>state.user
export function useAuth(){return useSyncExternalStore(subscribe,()=>state.user)}
export function useGuestSession(){return useSyncExternalStore(subscribe,()=>state)}
