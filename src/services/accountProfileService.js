import { accountClient,requireAccount } from '../config/accountClient'
export async function fetchProfile(){
 const user=await requireAccount()
 const {data,error}=await accountClient.from('merch_profiles').select('*').eq('id',user.id).maybeSingle()
 if(error)throw new Error(error.message)
 return data||{id:user.id,username:'Member',bio:''}
}
export async function saveUserProfile(profile){
 const user=await requireAccount(),username=profile.username.trim(),bio=profile.bio.trim()
 if(username.length<2||username.length>60||bio.length>500)throw new Error('Nama 2–60 karakter; bio maksimal 500 karakter.')
 const {data,error}=await accountClient.from('merch_profiles').upsert({id:user.id,username,bio}).select().single()
 if(error)throw new Error(error.message)
 return {success:true,data}
}
