import test from 'node:test'
import assert from 'node:assert/strict'
import { reportHandlers } from '../src/lib/reports/http'

test('admin filters validate source, category and bounded search, then reach the repository', async () => {
  const previous = process.env.REPORT_ADMIN_EMAILS
  process.env.REPORT_ADMIN_EMAILS = 'owner@example.test'
  try {
    let received: unknown
    const handlers = reportHandlers({ session: async () => ({ user: { id: 'admin', email: 'owner@example.test' } }), allow: () => true,
      store: { ownsGame: async () => false, ownsOpening: async () => false, save: async () => ({ id: 'unused' }) },
      list: async filters => { received = filters; return { reports: [] } }, update: async () => null })
    assert.equal((await handlers.GET(new Request('http://localhost/api/reports?source=PLAY&category=WRONG_EFFECT&q=ST01&status=NEW'))).status, 200)
    assert.deepEqual(received, { source: 'PLAY', category: 'WRONG_EFFECT', q: 'ST01', status: 'NEW' })
    for (const query of ['source=INVALID', 'category=INVALID', `q=${'x'.repeat(121)}`]) assert.equal((await handlers.GET(new Request(`http://localhost/api/reports?${query}`))).status, 400)
  } finally { if (previous === undefined) delete process.env.REPORT_ADMIN_EMAILS; else process.env.REPORT_ADMIN_EMAILS = previous }
})

const body = { requestId: 'test', source: 'BOOSTER', category: 'BUG', description: 'Le bouton ne répond plus.', context: { pathname: '/booster-opening' } }
const request = (method: string, data: unknown = body, origin = 'http://localhost:3000') => new Request('http://localhost:3000/api/reports', { method, headers: { Origin: origin, 'Content-Type': 'application/json' }, ...(method !== 'GET' ? { body: JSON.stringify(data) } : {}) })
function setup(email = 'player@example.test', authenticated = true, allow = true) {
  const reports = new Map<string, { id: string }>()
  let reads = 0, updates = 0, saves = 0
  const handlers = reportHandlers({
    session: async () => authenticated ? { user: { id: 'user-1', email } } : null,
    allow: () => allow,
    store: { ownsGame: async () => false, ownsOpening: async () => false, save: async data => { saves++; const key = `${data.userId}:${data.requestId}`; const found = reports.get(key) ?? { id: 'report-1' }; reports.set(key, found); return found } },
    list: async () => { reads++; return { reports: [], nextCursor: null } },
    update: async (id, status) => { updates++; return id === 'missing' ? null : { id, status } },
  })
  return { handlers, reports, counts: () => ({ reads, updates, saves }) }
}
test('anonymous requests cannot create, read or update reports', async () => {
  const { handlers, counts } = setup('', false)
  for (const method of ['POST', 'GET', 'PATCH'] as const) assert.equal((await handlers[method](request(method))).status, 401)
  assert.deepEqual(counts(), { reads: 0, updates: 0, saves: 0 })
})
test('ordinary users cannot access the inbox or moderation, including forged body role', async () => {
  const { handlers, counts } = setup()
  assert.equal((await handlers.GET(request('GET'))).status, 403)
  assert.equal((await handlers.PATCH(request('PATCH', { id: 'report-1', status: 'FIXED', admin: true }))).status, 403)
  assert.deepEqual(counts(), { reads: 0, updates: 0, saves: 0 })
})
test('submission rejects cross-origin, excessive payloads, invalid JSON, rate limit and foreign game context', async () => {
  const { handlers } = setup()
  assert.equal((await handlers.POST(request('POST', body, 'https://untrusted.example'))).status, 403)
  assert.equal((await handlers.POST(request('POST', { ...body, description: 'a'.repeat(65000) }))).status, 413)
  assert.equal((await handlers.POST(new Request('http://localhost:3000/api/reports', { method: 'POST', body: '{' }))).status, 400)
  assert.equal((await setup('player@example.test', true, false).handlers.POST(request('POST'))).status, 429)
  assert.equal((await handlers.POST(request('POST', { ...body, source: 'PLAY', context: { gameId: 'another-users-game' } }))).status, 404)
})
test('successful retry uses the same reporter and request key; responses are private', async () => {
  const { handlers, reports } = setup()
  for (let i = 0; i < 2; i++) {
    const response = await handlers.POST(request('POST'))
    assert.equal(response.status, 201)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), { id: 'report-1' })
  }
  assert.equal(reports.size, 1)
})
test('authorized admin can filter and moderate only supported statuses', async () => {
  const prior = process.env.REPORT_ADMIN_EMAILS
  process.env.REPORT_ADMIN_EMAILS = 'owner@example.test'
  try {
    const { handlers, counts } = setup('owner@example.test')
    assert.equal((await handlers.GET(request('GET'))).status, 200)
    assert.equal((await handlers.GET(new Request('http://localhost:3000/api/reports?status=INVALID'))).status, 400)
    assert.equal((await handlers.PATCH(request('PATCH', { id: 'report-1', status: 'FIXED' }))).status, 200)
    assert.equal((await handlers.PATCH(request('PATCH', { id: 'report-1', status: 'DELETED' }))).status, 400)
    assert.equal((await handlers.PATCH(request('PATCH', { id: 'missing', status: 'FIXED' }))).status, 404)
    assert.deepEqual(counts(), { reads: 1, updates: 2, saves: 0 })
  } finally { if (prior === undefined) delete process.env.REPORT_ADMIN_EMAILS; else process.env.REPORT_ADMIN_EMAILS = prior }
})
