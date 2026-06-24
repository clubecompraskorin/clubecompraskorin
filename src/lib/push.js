import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export const pushSuportado = () =>
  'serviceWorker' in navigator && 'PushManager' in window && Boolean(VAPID_PUBLIC_KEY)

/** Verifica se este dispositivo/navegador já está inscrito (sem pedir permissão). */
export const pushJaInscrito = async () => {
  if (!pushSuportado()) return false
  try {
    const reg = await navigator.serviceWorker.getRegistration('/painel')
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    return Boolean(sub)
  } catch { return false }
}

/** Pede permissão (se preciso) e cadastra a inscrição deste dispositivo pra organização. */
export const ativarPush = async (orgId) => {
  if (!pushSuportado()) return { ok: false, error: 'Notificações não são suportadas neste navegador' }
  try {
    const permissao = await Notification.requestPermission()
    if (permissao !== 'granted') return { ok: false, error: 'Permissão de notificação não concedida' }

    const reg = await navigator.serviceWorker.getRegistration('/painel')
    if (!reg) return { ok: false, error: 'App ainda não está pronto — recarregue a página e tente de novo' }

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const key = sub.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert({
      org_id: orgId,
      endpoint: sub.endpoint,
      p256dh: key.keys.p256dh,
      auth: key.keys.auth,
      user_agent: navigator.userAgent,
    }, { onConflict: 'endpoint' })
    if (error) throw error

    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

/** Cancela a inscrição deste dispositivo. */
export const desativarPush = async () => {
  if (!pushSuportado()) return { ok: true }
  try {
    const reg = await navigator.serviceWorker.getRegistration('/painel')
    const sub = reg ? await reg.pushManager.getSubscription() : null
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}
