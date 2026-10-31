import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchProfile,saveUserProfile } from '../services/accountProfileService'
import { useGuestSession,retryGuestSession } from '../hooks/useAuth'
import { queryClient } from '../config/queryClient'
function Form({profile,onBack}){
 const [name,setName]=useState(profile.username),[bio,setBio]=useState(profile.bio),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function save(e){e.preventDefault();setBusy(true);try{await saveUserProfile({username:name,bio});await queryClient.invalidateQueries({queryKey:['profile']});onBack()}catch(err){setError(err.message)}finally{setBusy(false)}}
 return <form className="profile-form" onSubmit={save}><h1>Edit Profile</h1><label>Nama<input className="form-input" required minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>Bio<textarea className="form-textarea" maxLength={500} value={bio} onChange={e=>setBio(e.target.value)}/></label>
 {error&&<p role="alert">{error}</p>}<button disabled={busy} className="btn btn--primary">{busy?'Menyimpan…':'Simpan'}</button><button type="button" className="btn btn--outline" onClick={onBack}>Kembali</button></form>
}
export default function EditProfilePage({onBack}){
 const {user,loading,error}=useGuestSession(),q=useQuery({queryKey:['profile',user?.id],queryFn:fetchProfile,enabled:!!user})
 if(!user)return <section><p role={error?'alert':'status'}>{loading?'Menghubungkan profil perangkat…':error||'Sesi perangkat belum siap.'}</p>{!loading&&<button className="btn btn--outline" onClick={retryGuestSession}>Hubungkan kembali</button>}<button className="btn btn--outline" onClick={onBack}>Kembali</button></section>
 if(q.isLoading)return <p>Memuat profil…</p>
 if(q.error)return <p role="alert">{q.error.message}</p>
 return <Form profile={q.data} onBack={onBack}/>
}
