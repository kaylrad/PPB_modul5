import { createClient } from '@supabase/supabase-js'
const url=import.meta.env.VITE_ACCOUNT_API_URL
const key=import.meta.env.VITE_ACCOUNT_PUBLISHABLE_KEY
export const accountClient=url&&key&&!url.includes('YOUR_PROJECT')&&key!=='YOUR_PUBLISHABLE_KEY'?createClient(url,key,{auth:{storageKey:'bore_barrel_account'}}):null
export async function requireAccount(){
 if(!accountClient)throw new Error('Database akun belum dikonfigurasi.')
 const {data,error}=await accountClient.auth.getUser()
 if(error||!data.user)throw new Error('Silakan login terlebih dahulu.')
 return data.user
}
