// api/verificar-prazos.js — Vercel Serverless Function (cron, ver vercel.json)
// Roda a cada 15min. Fecha automaticamente por conta própria (isPeriodoFechado
// em lib/store-web.js já trata isso na hora de exibir), então este endpoint
// só cuida de AVISAR os membros quando isso acontece -- não muda
// catalogo_aberto no banco, só marca push_fechamento_enviado pra não avisar
// duas vezes. Protegido por CRON_SECRET pra não virar disparador público de
// notificação em massa.

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
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'Não autorizado' })
  }

  try {
    // Períodos abertos, com data limite definida, já vencida (fim do dia),
    // e que ainda não geraram o aviso de fechamento.
    const hojeISO = new Date().toISOString().slice(0, 10)
    const { data: periodos, error } = await supabaseAdmin
      .from('periodos')
      .select('id, nome, org_id, organizacoes(slug)')
      .eq('status', 'aberto').eq('catalogo_aberto', true).eq('push_fechamento_enviado', false)
      .not('data_limite', 'is', null)
      .lt('data_limite', hojeISO) // data_limite é DATE puro — "<hoje" já garante que o dia inteiro passou
    if (error) throw error
    if (!periodos || !periodos.length) return res.status(200).json({ ok: true, avisados: 0 })

    let avisados = 0
    if (process.env.VAPID_PRIVATE_KEY) {
      for (const periodo of periodos) {
        const { data: subs } = await supabaseAdmin
          .from('push_subscriptions_membros').select('*').eq('org_id', periodo.org_id)
        if (subs && subs.length) {
          const url = '/' + (periodo.organizacoes?.slug || '') + '/pedido'
          const payload = JSON.stringify({
            titulo: '🔴 Catálogo encerrado',
            corpo: `${periodo.nome || 'O período'} não está mais recebendo pedidos — a data limite passou.`,
            url, tag: 'korin-periodo',
          })
          await Promise.all(subs.map(async (sub) => {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
            } catch (e) {
              if (e.statusCode === 404 || e.statusCode === 410) {
                await supabaseAdmin.from('push_subscriptions_membros').delete().eq('endpoint', sub.endpoint)
              }
            }
          }))
        }
        await supabaseAdmin.from('periodos').update({ push_fechamento_enviado: true }).eq('id', periodo.id)
        avisados++
      }
    }

    return res.status(200).json({ ok: true, avisados })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
