// api/notificar-membros.js — Vercel Serverless Function
// Dispara push pra todo membro inscrito de uma org quando o catálogo abre ou
// fecha. Chamado (1) pela Dedicante logo após ela apertar Abrir/Fechar em
// Config, e (2) por api/verificar-prazos.js quando a data limite vence
// sozinha. Nunca deve derrubar quem chama -- setVapidDetails dentro de
// try/catch (lição do bug de 28/08 em api/pedido.js).

import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:gestao.junior.lopes@gmail.com',
      process.env.VAPID_PUBLIC_KEY.trim(),
      process.env.VAPID_PRIVATE_KEY.trim()
    )
  } catch (e) {
    console.error('VAPID setup falhou — push desativado:', e.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!process.env.VAPID_PRIVATE_KEY) return res.status(200).json({ ok: true, enviados: 0 })

  const { orgId, tipo, periodoNome, slug } = req.body
  if (!orgId || !['abriu', 'fechou'].includes(tipo)) {
    return res.status(400).json({ ok: false, error: 'orgId e tipo (abriu|fechou) são obrigatórios' })
  }

  try {
    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions_membros').select('*').eq('org_id', orgId)
    if (error) throw error
    if (!subs || !subs.length) return res.status(200).json({ ok: true, enviados: 0 })

    const url = '/' + (slug || '') + '/pedido'
    const payload = JSON.stringify(
      tipo === 'abriu'
        ? { titulo: '🟢 Catálogo aberto!', corpo: `${periodoNome || 'Novo período'} — já dá pra fazer seu pedido.`, url, tag: 'korin-periodo' }
        : { titulo: '🔴 Catálogo encerrado', corpo: `${periodoNome || 'O período'} não está mais recebendo pedidos.`, url, tag: 'korin-periodo' }
    )

    let enviados = 0
    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        enviados++
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions_membros').delete().eq('endpoint', sub.endpoint)
        }
      }
    }))

    return res.status(200).json({ ok: true, enviados })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
