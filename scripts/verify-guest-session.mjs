import assert from 'node:assert/strict'
import { createGuestSessionInitializer } from '../src/utils/guestSession.js'
let creates=0
const existing={id:'existing-identity'}
const reuse=createGuestSessionInitializer({auth:{
 getSession:async()=>({data:{session:{user:existing}}}),
 signInAnonymously:async()=>{creates++;throw new Error('Must not replace an existing identity')},
}})
assert.equal((await reuse.ensure()).id,existing.id)
assert.equal(creates,0)
const guest={id:'guest-identity',is_anonymous:true}
const startup=createGuestSessionInitializer({auth:{
 getSession:async()=>({data:{session:null}}),
 signInAnonymously:async()=>{creates++;return {data:{user:guest},error:null}},
}})
const users=await Promise.all([startup.ensure(),startup.ensure(),startup.ensure()])
assert.equal(creates,1)
assert.ok(users.every(u=>u.id===guest.id))
let fails=true
const retry=createGuestSessionInitializer({auth:{
 getSession:async()=>({data:{session:null}}),
 signInAnonymously:async()=>fails?{error:new Error('Provider disabled')}:{data:{user:guest}},
}})
await assert.rejects(()=>retry.ensure(),/Provider disabled/)
fails=false;assert.equal((await retry.ensure()).id,guest.id)
const refreshError=createGuestSessionInitializer({auth:{
 getSession:async()=>({error:new Error('Refresh failed')}),
 signInAnonymously:async()=>{throw new Error('Identity must not be silently replaced')},
}})
await assert.rejects(()=>refreshError.ensure(),/Refresh failed/)
console.log('PASS anonymous sessions: existing identity reused, parallel startup deduped, explicit retry, refresh failure preserves identity')
