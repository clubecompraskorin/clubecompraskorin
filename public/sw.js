const CACHE = 'korin-admin-v7'

self.addEventListener('install', e => { self.skipWaiting() })

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  // NÃO intercepta /pedido — deixa o SW do catálogo cuidar
  if (url.pathname.startsWith('/pedido')) return
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/api/')) return

  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
      }
      return res
    }).catch(() => caches.match(e.request).then(c => c || caches.match('/painel.html')))
  )
})

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// ── PUSH (pedido novo/alterado vindo do catálogo) ───────────────────────────
self.addEventListener('push', e => {
  let dados = {}
  try { dados = e.data ? e.data.json() : {} } catch {}
  const titulo = dados.titulo || 'Clube de Compras Korin'
  const opcoes = {
    body: dados.corpo || '',
    icon: '/logo-korin.png',
    badge: '/logo-korin.png',
    data: { url: dados.url || '/painel' },
    tag: dados.tag || undefined,
  }
  e.waitUntil(self.registration.showNotification(titulo, opcoes))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/painel'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const aberto = clients.find(c => c.url.includes('/painel'))
      if (aberto) return aberto.focus()
      return self.clients.openWindow(url)
    })
  )
})
