import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export const logPwaInstall = async (app) => {
  if (!supabase) return
  try {
    await supabase.from('pwa_events').insert({
      app, event_type: 'installed', user_agent: navigator.userAgent,
    })
  } catch {}
}

export const getPwaInstallCount = async (app) => {
  if (!supabase) return null
  try {
    const { count, error } = await supabase
      .from('pwa_events').select('id', { count: 'exact', head: true })
      .eq('app', app)
    if (error) throw error
    return count || 0
  } catch { return null }
}

// Captura o evento ANTES do React montar para não perder
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    window.__installPromptEvent = e
  })
}

// ── HOOK DE INSTALAÇÃO ────────────────────────────────────────────────────────
export function useInstallPrompt(app) {
  const KEY = 'pwa-dismissed-' + app
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow]   = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return
    if (localStorage.getItem(KEY)) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    // Pega evento já capturado antes do React montar
    if (window.__installPromptEvent) {
      setDeferredPrompt(window.__installPromptEvent)
      setShow(true)
      return
    }

    // Ou iOS — mostra instruções direto
    if (ios) { setShow(true); return }

    // Escuta eventos futuros
    const handler = e => {
      e.preventDefault()
      window.__installPromptEvent = e
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => { setShow(false); window.__installPromptEvent = null })

    // Fallback: após 3s sem evento, mostra botão com instruções manuais
    const timer = setTimeout(() => {
      if (!window.__installPromptEvent && !localStorage.getItem(KEY)) {
        setShow('manual')
      }
    }, 3000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(timer)
    }
  }, [KEY])

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      window.__installPromptEvent = null
      if (outcome === 'accepted') { logPwaInstall(app); setShow(false) }
    } else {
      // Sem prompt nativo — mostra instruções manuais
      setShow('manual')
    }
  }

  const dismiss = () => { localStorage.setItem(KEY, '1'); setShow(false) }

  return { show, isIOS, install, dismiss }
}
