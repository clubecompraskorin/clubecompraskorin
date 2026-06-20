import React from 'react'
import ReactDOM from 'react-dom/client'
import CatalogoApp, { getSlugDaURL } from './CatalogoApp'
import './index.css'
import { logPwaInstall } from './lib/pwa'
import { Analytics } from '@vercel/analytics/react'

const slug = getSlugDaURL()

// Manifest precisa ser dinâmico por organização (start_url/scope variam por slug)
if (slug) {
  const link = document.querySelector('link[rel="manifest"]')
  if (link) link.setAttribute('href', `/api/manifest-catalogo?slug=${encodeURIComponent(slug)}`)
}

if ('serviceWorker' in navigator && slug) {
  const scope = `/${slug}/pedido`
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw-catalogo.js', { scope })
      const forceUpdate = (sw) => {
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            sw.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      }
      if (reg.waiting) forceUpdate(reg.waiting)
      reg.addEventListener('updatefound', () => { if (reg.installing) forceUpdate(reg.installing) })
    } catch (e) { console.log('SW registration failed', e) }
  })
}

window.addEventListener('appinstalled', () => logPwaInstall('catalogo'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CatalogoApp />
    <Analytics />
  </React.StrictMode>
)
