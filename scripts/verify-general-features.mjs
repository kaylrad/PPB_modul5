import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
let client
try{
 const {queryClient}=await server.ssrLoadModule('/src/config/queryClient.js')
 let requests=0
 const options={queryKey:['cache-test'],queryFn:async()=>++requests}
 await Promise.all([queryClient.fetchQuery(options),queryClient.fetchQuery(options)])
 await queryClient.fetchQuery(options)
 assert.equal(requests,1)
 await queryClient.invalidateQueries({queryKey:['cache-test']})
 await queryClient.fetchQuery(options);assert.equal(requests,2);queryClient.clear()
 console.log('PASS cache: duplicate requests, freshness and invalidation')
 client=(await server.ssrLoadModule('/src/config/accountClient.js')).accountClient
 client.auth.getUser=async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111'}},error:null})
 const calls=[]
 client.rest.fetch=async(url,options)=>{
  calls.push({url:String(url),...options})
  return new Response(JSON.stringify({id:'11111111-1111-4111-8111-111111111111',username:'Member',bio:'Saved'}),{status:200,headers:{'Content-Type':'application/json'}})
 }
 const profiles=await server.ssrLoadModule('/src/services/accountProfileService.js')
 await profiles.saveUserProfile({username:'Member',bio:'Saved'})
 assert.equal(JSON.parse(calls.at(-1).body).id,'11111111-1111-4111-8111-111111111111')
 await assert.rejects(()=>profiles.saveUserProfile({username:'x',bio:''}),/Nama/)
 client.auth.getUser=async()=>({data:{user:null},error:null})
 await assert.rejects(()=>profiles.fetchProfile(),/login/)
 console.log('PASS profile: owner from session, validation, guest access rejected')
 const source=await readFile(new URL('../src/utils/draftStorage.js',import.meta.url),'utf8')
 const isolated=source.replace(/import .*currentUser.*\r?\n/,'const currentUser=()=>globalThis.testOwner\n').replace(/import .*getUserIdentifier.*\r?\n/,'const getUserIdentifier=()=>"device-test"\n')
 const draft=await import('data:text/javascript;base64,'+Buffer.from(isolated).toString('base64'))
 globalThis.localStorage={}
 Object.defineProperties(localStorage,{getItem:{value(k){return this[k]??null}},setItem:{value(k,v){this[k]=v}},removeItem:{value(k){delete this[k]}}})
 localStorage.setItem('gun_draft_create',JSON.stringify({name:'Legacy device draft'}))
 globalThis.testOwner=null;assert.equal(draft.loadDraft('create').name,'Legacy device draft')
 globalThis.testOwner={id:'A'};assert.equal(draft.loadDraft('create'),null);draft.saveDraft({name:'Private A'},'create')
 globalThis.testOwner={id:'B'};assert.equal(draft.loadDraft('create'),null);assert.equal(draft.getAllDraftIds().length,0)
 draft.saveDraft({name:'Private B'},'create');draft.clearAllDrafts()
 globalThis.testOwner={id:'A'};assert.equal(draft.loadDraft('create').name,'Private A')
 console.log('PASS drafts: legacy device data preserved; A/B account isolation; clear own drafts only')
}finally{client?.auth.stopAutoRefresh();await server.close();delete globalThis.localStorage;delete globalThis.testOwner}
