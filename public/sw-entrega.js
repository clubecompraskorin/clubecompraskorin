const CACHE = 'korin-entrega-v3'
const ASSETS = ['/icon-192.png', '/icon-512.png', '/logo-clube-unido.png']
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.filter(Boolean)).catch(()=>{})))
  self.skipWaiting()
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/api/')) return
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()))
        return res
      }).catch(() => caches.match(e.request))
    )
    return
  }
  e.respondWith(
    caches.match(e.request).then(c => c || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') caches.open(CACHE).then(ca => ca.put(e.request, res.clone()))
      return res
    }))
  )
})
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
