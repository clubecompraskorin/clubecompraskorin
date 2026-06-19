import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { logPwaInstall } from './lib/pwa'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
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

window.addEventListener('appinstalled', () => logPwaInstall('admin'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
