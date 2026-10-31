import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { parseRoute, itemUrl, pageHash } from '../src/utils/routes.js'
assert.deepEqual(parseRoute('#item/abc-123'), {kind:'item',id:'abc-123'})
for (const hash of ['#item/%ZZ','#item/%2F','#item/local-1','#item/abc?owner=x','#item/']) assert.equal(parseRoute(hash).kind,'invalid')
assert.equal(itemUrl('https://example.org/#profile','abc-123'),'https://example.org/#item/abc-123')
for (const id of [undefined,null,'local-1','abc/123']) assert.throws(()=>itemUrl('https://example.org',id))
assert.deepEqual(parseRoute(pageHash('EditProfile')),{kind:'page',page:'EditProfile'})
console.log('PASS routes: unique stable detail URL, direct page routes, malformed/local IDs rejected')
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
let client
try {
  client=(await server.ssrLoadModule('/src/config/accountClient.js')).accountClient
  const owner='11111111-1111-4111-8111-111111111111'
  client.auth.getUser=async()=>({data:{user:{id:owner}},error:null})
  const calls=[]
  client.rest.fetch=async(url,options)=>{
    calls.push({url:String(url),...options})
    const body=options.body?JSON.parse(options.body):{}
    return new Response(JSON.stringify(options.method==='GET'?[]:{id:'review-id',...body}),{status:200,headers:{'Content-Type':'application/json'}})
  }
  const archive=await server.ssrLoadModule('/src/services/catalogArchiveService.js')
  await archive.setCatalogArchived({id:'item-1',name:'Test record',owner_id:'attacker',secret:'excluded'},true,owner)
  let body=JSON.parse(calls.at(-1).body)
  assert.equal(body.owner_id,owner);assert.ok(body.archived_at);assert.equal(body.snapshot.secret,undefined)
  await archive.setCatalogArchived({id:'item-1',name:'Test record'},false,owner)
  assert.equal(JSON.parse(calls.at(-1).body).archived_at,null)
  await archive.listCatalogArchives(owner)
  assert.ok(calls.at(-1).url.includes('owner_id=eq.'+owner))
  assert.ok(calls.at(-1).url.includes('archived_at=not.is.null'))
  await assert.rejects(()=>archive.setCatalogArchived({id:'item-1'},true,'other'),/Sesi/)
  await assert.rejects(()=>archive.setCatalogArchived({}),/ID/)
  await assert.rejects(()=>archive.setCatalogArchived({id:'bad/id'}),/ID/)
  console.log('PASS archives: session owner, whitelist snapshot, archive/restore marker, owner filtering, session guard')
  const reviews=await server.ssrLoadModule('/src/services/catalogReviewService.js')
  await reviews.createCatalogReview('item-1',{rating:4,comment:'  Review QA  ',user_id:'forged'})
  body=JSON.parse(calls.at(-1).body)
  assert.equal(body.user_id,owner);assert.equal(body.comment,'Review QA');assert.equal(body.rating,4)
  for (const data of [{rating:0},{rating:6},{rating:2.5},{rating:3,comment:'x'.repeat(501)}]) await assert.rejects(()=>reviews.createCatalogReview('item-1',data),/Rating/)
  await assert.rejects(()=>reviews.createCatalogReview('local-1',{rating:5}),/ID/)
  await reviews.updateCatalogReview('review-id',{rating:3,comment:'Edited'})
  assert.equal(calls.at(-1).method,'PATCH');assert.ok(calls.at(-1).url.includes('user_id=eq.'+owner))
  await reviews.deleteCatalogReview('review-id')
  assert.equal(calls.at(-1).method,'PATCH');assert.ok(JSON.parse(calls.at(-1).body).deleted_at)
  assert.ok(calls.at(-1).url.includes('user_id=eq.'+owner))
  await assert.rejects(()=>reviews.voteCatalogReview({id:'review-id',user_id:owner},1,0),/sendiri/)
  await assert.rejects(()=>reviews.voteCatalogReview({id:'review-id',user_id:'other'},2,0),/valid/)
  await reviews.voteCatalogReview({id:'review-id',user_id:'other'},1,0)
  body=JSON.parse(calls.at(-1).body);assert.equal(body.user_id,owner);assert.equal(body.value,1)
  await reviews.voteCatalogReview({id:'review-id',user_id:'other'},1,1)
  assert.equal(JSON.parse(calls.at(-1).body).value,0)
  await reviews.voteCatalogReview({id:'review-id',user_id:'other'},-1,1)
  assert.equal(JSON.parse(calls.at(-1).body).value,-1)
  await reviews.listArchivedReviews(owner)
  assert.ok(calls.at(-1).url.includes('user_id=eq.'+owner));assert.ok(calls.at(-1).url.includes('deleted_at=not.is.null'))
  await reviews.restoreCatalogReview('review-id')
  assert.equal(JSON.parse(calls.at(-1).body).deleted_at,null)
  assert.ok(calls.at(-1).url.includes('user_id=eq.'+owner))
  assert.ok(calls.every(c=>c.method!=='DELETE'))
  client.auth.getUser=async()=>({data:{user:null},error:null})
  await assert.rejects(()=>reviews.createCatalogReview('item-1',{rating:5}),/Sesi/)
  console.log('PASS reviews: session owner, rating/comment validation, scoped update, soft delete, self-vote rejection, toggle/switch vote')
} finally {client?.auth.stopAutoRefresh();await server.close()}
