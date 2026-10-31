import { createGuestSessionInitializer } from '../utils/guestSession'
import { createClient } from '@supabase/supabase-js'
const url=import.meta.env.VITE_ACCOUNT_API_URL
const key=import.meta.env.VITE_ACCOUNT_PUBLISHABLE_KEY
export const accountClient=url&&key&&!url.includes('YOUR_PROJECT')&&key!=='YOUR_PUBLISHABLE_KEY'?createClient(url,key,{auth:{storageKey:'bore_barrel_account'}}):null
const withBrowserLock=fn=>typeof navigator!=='undefined'&&navigator.locks
 ? navigator.locks.request('bore_barrel_guest_setup',fn) : Promise.resolve().then(fn)
const initializer=createGuestSessionInitializer(accountClient,withBrowserLock)
export const ensureGuestSession=()=>initializer.ensure()
export async function requireAccount(){
 if(!accountClient)throw new Error('Database akun belum dikonfigurasi.')
 if(typeof window!=='undefined')await ensureGuestSession()
 const {data,error}=await accountClient.auth.getUser()
 if(error||!data.user)throw new Error('Sesi perangkat belum siap. Coba hubungkan kembali melalui Profile.')
 return data.user
}
