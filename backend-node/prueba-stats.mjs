const base = 'http://127.0.0.1:8000/api'
const r = await fetch(base + '/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@urbanstyle.pe', password: 'Admin123!' }),
})
const { data } = await r.json()
const s = await fetch(base + '/admin/stats', { headers: { Authorization: `Bearer ${data.token}` } })
const j = await s.json()
console.log('HTTP', s.status)
console.log(JSON.stringify(j.data, null, 1))
