const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export const pushSuportadoMembro = () =>
  'serviceWorker' in navigator && 'PushManager' in window && Boolean(VAPID_PUBLIC_KEY)

/** Verifica se este dispositivo já está inscrito (sem pedir permissão). */
export const pushJaInscritoMembro = async () => {
  if (!pushSuportadoMembro()) return false
  try {
    const reg = await navigator.serviceWorker.getRegistration('/pedido')
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    return Boolean(sub)
  } catch { return false }
}

/** Pede permissão e inscreve este dispositivo pra avisos daquele catálogo (slug). */
export const ativarPushMembro = async (slug) => {
  if (!pushSuportadoMembro()) return { ok: false, error: 'Notificações não são suportadas neste navegador' }
  try {
    if (await Notification.requestPermission() !== 'granted') return { ok: false, error: 'Permissão de notificação não concedida' }
    const reg = await navigator.serviceWorker.getRegistration('/pedido')
    if (!reg) return { ok: false, error: 'App ainda não está pronto — recarregue a página e tente de novo' }
    let sub = await reg.pushManager.getSubscription()
    sub ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })
    const r = await fetch('/api/membros', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'inscrever', slug, subscription: sub.toJSON() }),
    })
    const json = await r.json()
    if (!r.ok || !json.ok) return { ok: false, error: json.error || 'Falha ao inscrever' }
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}
