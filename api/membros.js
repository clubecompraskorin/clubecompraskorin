// api/membros.js — Vercel Serverless Function
// Consolida 3 responsabilidades num arquivo só (Vercel Hobby limita a 12
// Serverless Functions por deploy — 3 arquivos separados estourava o
// limite, já perto do teto com os endpoints existentes):
//   POST { acao: 'inscrever',  slug, subscription }         → membro ativa aviso
//   POST { acao: 'notificar',  orgId, tipo, periodoNome, slug } → Dedicante avisa (Abrir/Fechar)
//   GET  (cron, ver vercel.json)                             → checa data limite vencida

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

// Envia pra uma lista de inscrições, limpa quem expirou (404/410). Nunca
// derruba quem chama se o push falhar.
async function enviarPara(subs, payload) {
  let enviados = 0
  await Promise.all((subs || []).map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
      enviados++
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await supabaseAdmin.from('push_subscriptions_membros').delete().eq('endpoint', sub.endpoint)
      }
    }
  }))
  return enviados
}

async function inscrever(req, res) {
  const { slug, subscription } = req.body
  if (!slug || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ ok: false, error: 'slug e subscription são obrigatórios' })
  }
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizacoes').select('id, ativo').eq('slug', slug).maybeSingle()
  if (orgError) throw orgError
  if (!org || !org.ativo) return res.status(404).json({ ok: false, error: 'Organização não encontrada ou inativa' })

  const { error } = await supabaseAdmin.from('push_subscriptions_membros').upsert({
    org_id: org.id, endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh, auth: subscription.keys.auth,
  }, { onConflict: 'endpoint' })
  if (error) throw error
  return res.status(200).json({ ok: true })
}

async function notificar(req, res) {
  if (!process.env.VAPID_PRIVATE_KEY) return res.status(200).json({ ok: true, enviados: 0 })
  const { orgId, tipo, periodoNome, slug } = req.body
  if (!orgId || !['abriu', 'fechou'].includes(tipo)) {
    return res.status(400).json({ ok: false, error: 'orgId e tipo (abriu|fechou) são obrigatórios' })
  }
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
  const enviados = await enviarPara(subs, payload)
  return res.status(200).json({ ok: true, enviados })
}

async function verificarPrazos(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'Não autorizado' })
  }
  const hojeISO = new Date().toISOString().slice(0, 10)
  const { data: periodos, error } = await supabaseAdmin
    .from('periodos')
    .select('id, nome, org_id, organizacoes(slug)')
    .eq('status', 'aberto').eq('catalogo_aberto', true).eq('push_fechamento_enviado', false)
    .not('data_limite', 'is', null)
    .lt('data_limite', hojeISO)
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
        await enviarPara(subs, payload)
      }
      await supabaseAdmin.from('periodos').update({ push_fechamento_enviado: true }).eq('id', periodo.id)
      avisados++
    }
  }
  return res.status(200).json({ ok: true, avisados })
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return await verificarPrazos(req, res)
    if (req.method !== 'POST') return res.status(405).end()

    const { acao } = req.body || {}
    if (acao === 'inscrever') return await inscrever(req, res)
    if (acao === 'notificar') return await notificar(req, res)
    return res.status(400).json({ ok: false, error: 'acao inválida' })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
