import assert from 'node:assert/strict'
import { createServer } from 'vite'

// Test application services without modifying the shared lab database.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: guns } = await server.ssrLoadModule('/src/services/gunService.js')
  const { default: favorites } = await server.ssrLoadModule('/src/services/favoriteService.js')
  const { default: reviews } = await server.ssrLoadModule('/src/services/reviewService.js')
  const { apiClient, IS_SUPABASE } = await server.ssrLoadModule('/src/config/api.js')
  assert.equal(IS_SUPABASE, true, 'Copy .env.example to .env before testing')
  const requests = []
  apiClient.defaults.adapter = async (config) => {
    requests.push(config)
    return { data: [{ id: 123, name: 'Module test', price: 12, specs: ['Frame: Steel'] }],
      status: 200, statusText: 'OK', headers: {}, config }
  }
  const result = await guns.getGuns({ sort_by: 'price', order: 'desc', search: 'test', limit: 5 })
  assert.ok(requests.at(-1).url.includes('order=price.desc'))
  assert.equal(result.data[0].ingredients[0].quantity, 'Steel')
  await guns.createGun({ name: 'Test', price: 12, ingredients: [{ name: 'Frame', quantity: 'Steel' }] })
  assert.equal(requests.at(-1).method, 'post')
  assert.deepEqual(JSON.parse(requests.at(-1).data).specs, ['Frame: Steel'])
  await guns.updateGun(123, { price: 15 })
  assert.equal(requests.at(-1).method, 'patch')
  assert.equal(JSON.parse(requests.at(-1).data).price, 15)
  await guns.deleteGun(123)
  assert.equal(requests.at(-1).method, 'delete')
  await favorites.toggleFavorite({ recipe_id: 123, user_identifier: 'test-user' })
  assert.ok(requests.at(-1).url.includes('product_id=eq.123&user_id=eq.test-user'))
  await reviews.createReview(123, { user_identifier: 'test-user', rating: 4, comment: 'Test' })
  assert.equal(JSON.parse(requests.at(-1).data).product_id, 123)

  globalThis.localStorage = {}
  Object.defineProperties(localStorage, {
    getItem: { value(key) { return this[key] ?? null } },
    setItem: { value(key, value) { this[key] = String(value) } },
    removeItem: { value(key) { delete this[key] } },
  })
  const draft = await server.ssrLoadModule('/src/utils/draftStorage.js')
  draft.saveDraft({ name: 'Create draft' }, 'create')
  draft.saveDraft({ name: 'Edit draft' }, '123')
  assert.equal(draft.loadDraft('create').name, 'Create draft')
  assert.equal(draft.loadDraft('123').name, 'Edit draft')
  assert.ok(draft.getDraftTimestamp('create'))
  draft.clearAllDrafts()
  assert.equal(draft.hasDraft('create'), false)
  assert.equal(draft.hasDraft('123'), false)
  console.log('PASS: sorting, CRUD requests, favorites, reviews, and draft persistence')
} finally {
  delete globalThis.localStorage
  await server.close()
}
