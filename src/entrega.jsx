import React from 'react'
import ReactDOM from 'react-dom/client'
import EntregaApp from './EntregaApp'
import { getSlugDaURL } from './CatalogoApp'
import './index.css'
import { logPwaInstall } from './lib/pwa'
import { Analytics } from '@vercel/analytics/react'

const slug = getSlugDaURL()
const unidadeId = new URLSearchParams(window.location.search).get('u')
if (slug) {
  const link = document.querySelector('link[rel="manifest"]')
  if (link) link.setAttribute('href', `/api/manifest-entrega?slug=${encodeURIComponent(slug)}${unidadeId ? `&u=${encodeURIComponent(unidadeId)}` : ''}`)
}
if ('serviceWorker' in navigator && slug) {
  const scope = `/${slug}/entrega`
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw-entrega.js', { scope })
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
window.addEventListener('appinstalled', () => logPwaInstall('entrega'))
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><EntregaApp /><Analytics /></React.StrictMode>
)
