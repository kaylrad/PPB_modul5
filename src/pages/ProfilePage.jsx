import DraftManager from '../components/common/DraftManager'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, Camera, Play } from 'lucide-react'
import { accountClient } from '../config/accountClient'
import { useAuth } from '../hooks/useAuth'
import { fetchProfile } from '../services/accountProfileService'
import userService from '../services/userService'
import { getAllDraftIds } from '../utils/draftStorage'
import { useFavorites } from '../hooks/useFavorites'
export default function ProfilePage({onReplaySplash,onNavigate}){
 const user=useAuth(),{favorites}=useFavorites()
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[register,setRegister]=useState(false)
 const [avatar,setAvatar]=useState(()=>userService.getUserProfile().avatar)
 const profile=useQuery({queryKey:['profile',user?.id],queryFn:fetchProfile,enabled:!!user&&!!accountClient})
 const [draftCount,setDraftCount]=useState(()=>getAllDraftIds().length)
 async function authenticate(e){
  e.preventDefault();setBusy(true);setMessage('')
  const fields=new FormData(e.currentTarget)
  const credentials={email:String(fields.get('email')).trim(),password:String(fields.get('password'))}
  try{
   if(!accountClient)throw new Error('Database akun belum dikonfigurasi.')
   const result=register?await accountClient.auth.signUp(credentials):await accountClient.auth.signInWithPassword(credentials)
   if(result.error)throw result.error
   setMessage(register?'Akun dibuat. Periksa email konfirmasi jika diminta, lalu login di halaman ini.':'Login berhasil.')
  }catch(error){setMessage(error.message)}finally{setBusy(false)}
 }
 function changeAvatar(e){
  const file=e.target.files[0]
  if(!file)return
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){setMessage('Gunakan JPG, PNG atau WebP maksimal 2 MB.');return}
  const reader=new FileReader()
  reader.onload=()=>{const result=userService.updateAvatar(reader.result);if(result.success)setAvatar(reader.result);else setMessage(result.message)}
  reader.onerror=()=>setMessage('Gambar tidak dapat dibaca.')
  reader.readAsDataURL(file)
 }
 return <section className="profile-page"><section className="masthead"><h1 className="display">Operator Profile</h1><p className="lede">Profil pengguna dan pengaturan aplikasi.</p>
 <button className="btn btn--outline" onClick={onReplaySplash}><Play size={14}/> Replay Intro</button></section>
 {message&&<p role="status">{message}</p>}
 <div className="profile-card"><div className="profile-card-top"><div className="avatar-wrap">
 {avatar?<img className="avatar-img" src={avatar} alt="Avatar pengguna"/>:<div className="avatar-placeholder"><Shield size={36}/></div>}
 <label className="avatar-upload-btn" title="Upload avatar"><Camera size={14}/><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden-file-input" onChange={changeAvatar}/></label></div>
 <div className="profile-identity"><h2>{profile.data?.username||userService.getUserProfile().username}</h2><p>{profile.data?.bio||(!user?userService.getUserProfile().bio:'')}</p></div></div>
 <div className="profile-stats"><div><strong>{favorites.length}</strong><p>Favorites</p></div><div><strong>{draftCount}</strong><p>Saved Drafts</p></div></div>
 {profile.isLoading&&user&&<p>Memuat profil database…</p>}{profile.error&&<p role="alert">{profile.error.message}</p>}
 {user&&<><button className="btn btn--primary" onClick={()=>onNavigate('EditProfile')}>Edit Profile</button><button className="btn btn--outline" onClick={async()=>{const result=await accountClient.auth.signOut();if(result.error)setMessage(result.error.message)}}>Logout</button></>}</div>
 {!user&&<form className="profile-form" onSubmit={authenticate}><h2>{register?'Daftar akun':'Login untuk menyimpan profil ke database'}</h2>
 <label>Email<input className="form-input" type="email" name="email" required autoComplete="email"/></label>
 <label>Password<input className="form-input" type="password" name="password" required minLength={8} autoComplete={register?'new-password':'current-password'}/></label>
 <button className="btn btn--primary" disabled={busy}>{busy?'Memproses…':register?'Daftar':'Login'}</button><button type="button" className="btn btn--outline" onClick={()=>setRegister(!register)}>{register?'Sudah punya akun':'Buat akun'}</button></form>}
 <DraftManager onNavigate={onNavigate} onCountChange={setDraftCount}/>
 <section className="profile-card"><h2>Informasi</h2><button className="btn btn--outline" onClick={()=>onNavigate('About')}>About</button><button className="btn btn--outline" onClick={()=>onNavigate('Contact')}>Contact</button></section></section>
}
