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

 const draftsApi=await server.ssrLoadModule('/src/services/accountDraftService.js')
 const owner='11111111-1111-4111-8111-111111111111'
 const draftCalls=[]
 client.rest.fetch=async(url,options)=>{
  draftCalls.push({url:String(url),...options})
  const body=options.body?JSON.parse(options.body):{}
  const row={owner_id:owner,draft_id:body.p_draft_id||'create',payload:body.p_payload||{formData:{name:'Database draft'}},archived_at:body.p_archived_at||null,updated_at:body.p_updated_at||'2026-10-31T10:00:00Z'}
  return new Response(JSON.stringify(String(url).includes('/rpc/')?row:[row]),{status:200,headers:{'Content-Type':'application/json'}})
 }
 const archived=await draftsApi.persistAccountDraft({id:'create',formData:{name:'Private draft'},savedAt:'2026-10-31T10:00:00Z'},'2026-10-31T10:00:00Z',owner)
 assert.ok(draftCalls.at(-1).url.includes('/rpc/save_account_draft'))
 assert.equal(archived.archivedAt,'2026-10-31T10:00:00Z')
 assert.equal(JSON.parse(draftCalls.at(-1).body).p_owner_id,undefined)
 await draftsApi.persistAccountDraft({...archived,savedAt:'2026-10-31T10:01:00Z'},null,owner)
 assert.equal(JSON.parse(draftCalls.at(-1).body).p_archived_at,null)
 const listed=await draftsApi.listAccountDrafts(owner)
 assert.ok(draftCalls.at(-1).url.includes('owner_id=eq.'+owner))
 assert.equal(listed[0].formData.name,'Database draft')
 await assert.rejects(()=>draftsApi.persistAccountDraft({id:'create'},null,'other-user'),/Sesi/)
 await assert.rejects(()=>draftsApi.persistAccountDraft({id:'invalid/id'}),/ID/)
 await assert.rejects(()=>draftsApi.persistAccountDraft({id:'create',text:'x'.repeat(1048577)}),/1 MB/)
 const merged=draftsApi.mergeDraftRecords(
  [{id:'create',savedAt:'2026-10-31T09:00:00Z',archivedAt:null}],
  [{id:'create',savedAt:'2026-10-31T10:00:00Z',archivedAt:'2026-10-31T10:00:00Z'}])
 assert.ok(merged[0].archivedAt)
 console.log('PASS database drafts: RPC save/restore, owner filtering, session-change guard, size limit, newest-version merge')
 client.auth.getUser=async()=>({data:{user:null},error:null})
 await assert.rejects(()=>profiles.fetchProfile(),/Sesi perangkat/)
 console.log('PASS profile: owner from session, validation, missing session rejected')
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

 draft.archiveLocalDraft('create',true)
 assert.equal(draft.loadDraft('create'),null)
 assert.equal(draft.getAllDraftIds().length,0)
 assert.equal(draft.getDraftRecords(true)[0].name,'Private A')
 assert.ok(draft.getDraftRecords(true)[0].archivedAt)
 draft.archiveLocalDraft('create',false)
 assert.equal(draft.loadDraft('create').name,'Private A')
 console.log('PASS local draft archives: hidden from active list, data retained, restoration')

 globalThis.testOwner={id:'guest-C',is_anonymous:true}
 assert.ok(draft.getImportableDeviceDrafts().some(r=>r.name==='Legacy device draft'))
 assert.equal(draft.importDeviceDrafts(),1)
 assert.equal(draft.loadDraft('create').name,'Legacy device draft')
 assert.equal(draft.getImportableDeviceDrafts().length,0)
 assert.ok(localStorage.getItem('gun_draft_create'))
 globalThis.testOwner={id:'A'}
 assert.equal(draft.loadDraft('create').name,'Private A')
 console.log('PASS device draft import: explicit anonymous recovery, original retained, other account data excluded')
 console.log('PASS drafts: legacy device data preserved; A/B account isolation; clear own drafts only')
}finally{client?.auth.stopAutoRefresh();await server.close();delete globalThis.localStorage;delete globalThis.testOwner}
