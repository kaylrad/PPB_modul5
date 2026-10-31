const pages={catalog:'Catalog',favorites:'Favorites',profile:'Profile',about:'About',contact:'Contact','edit-profile':'EditProfile'}
export function parseRoute(hash=''){
 const match=/^#item\/([^/?#]+)$/.exec(hash)
 if(match){try{const id=decodeURIComponent(match[1]);if(/^[a-zA-Z0-9_-]{1,100}$/.test(id)&&!id.startsWith('local-'))return {kind:'item',id}}catch{/* invalid encoding */}return {kind:'invalid'}}
 if(hash.startsWith('#item'))return {kind:'invalid'}
 return {kind:'page',page:pages[hash.replace(/^#/,'')]||'Catalog'}
}
export function itemUrl(base,id){
 if(id===undefined||id===null)throw new Error('Item ini belum memiliki tautan API.')
 id=String(id)
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||id.startsWith('local-'))throw new Error('Item ini belum memiliki tautan API.')
 const url=new URL(base);url.hash='item/'+encodeURIComponent(id);return url.href
}
export const pageHash=page=>'#'+(page==='EditProfile'?'edit-profile':page.toLowerCase())
