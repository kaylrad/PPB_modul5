import { useState } from 'react'
export default function InfoShare({page}){
 const [message,setMessage]=useState('')
 async function share(){
  const url=new URL(window.location.href);url.hash=page
  try{if(navigator.share)await navigator.share({title:page,url:url.href});else{await navigator.clipboard.writeText(url.href);setMessage('Link disalin.')}}catch(error){if(error.name!=='AbortError')setMessage('Tidak dapat membagikan link.')}
 }
 return <div><button className="btn btn--outline" onClick={share}>Share halaman</button><p role="status">{message}</p></div>
}
