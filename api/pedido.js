// api/pedido.js — Vercel Serverless Function
// Único ponto de escrita em korin_pedidos (tabela única pra pedido manual e
// de catálogo — aqui sempre origem='catalogo'). Usa service_role porque a
// tabela não tem policy pública (cliente final não tem login).
// Valida o período corrente no servidor — nunca confia no que o cliente envia.

import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:gestao.junior.lopes@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// Avisa a coordenadora (todos os dispositivos inscritos da organização) que
// um pedido do catálogo chegou ou foi alterado. Nunca derruba o pedido —
// se a notificação falhar, o pedido já foi salvo de qualquer forma.
async function notificarPedido(orgId, { ehNovo, nome, total }) {
  if (!process.env.VAPID_PRIVATE_KEY) return
  try {
    const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('*').eq('org_id', orgId)
    if (!subs || !subs.length) return

    const payload = JSON.stringify({
      titulo: ehNovo ? '🛒 Novo pedido no catálogo' : '✏️ Pedido do catálogo alterado',
      corpo: `${nome} · R$ ${Number(total || 0).toFixed(2).replace('.', ',')}`,
      url: '/painel',
      tag: 'korin-pedido',
    })

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch (e) {
        // Inscrição expirada/revogada — limpa pra não tentar de novo.
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }))
  } catch {}
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { slug, pedido } = req.body
  if (!slug || !pedido) return res.status(400).json({ ok: false, error: 'slug e pedido são obrigatórios' })

  try {
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizacoes').select('id, ativo').eq('slug', slug).maybeSingle()
    if (orgError) throw orgError
    if (!org || !org.ativo) return res.status(404).json({ ok: false, error: 'Organização não encontrada ou inativa' })

    const { data: periodo, error: perError } = await supabaseAdmin
      .from('periodos').select('id, nome, status, catalogo_aberto, data_limite')
      .eq('org_id', org.id).eq('is_corrente', true).maybeSingle()
    if (perError) throw perError
    if (!periodo) return res.status(404).json({ ok: false, error: 'Nenhum período configurado para este grupo' })

    if (periodo.status !== 'aberto' || !periodo.catalogo_aberto) {
      return res.status(403).json({ ok: false, error: 'Pedidos encerrados para este período' })
    }
    if (periodo.data_limite) {
      const limite = new Date(periodo.data_limite); limite.setHours(23, 59, 59, 999)
      if (new Date() > limite) return res.status(403).json({ ok: false, error: 'Pedidos encerrados para este período' })
    }

    // korin_pedidos guarda itens por produtoId (igual pedido manual) — o
    // catálogo público trabalha por código, então converte aqui.
    const { data: produtosPeriodo, error: prodError } = await supabaseAdmin
      .from('periodo_produtos').select('id, cod').eq('periodo_id', periodo.id)
    if (prodError) throw prodError
    const idPorCod = {}
    ;(produtosPeriodo || []).forEach(p => { idPorCod[p.cod] = p.id })

    const itensConvertidos = (pedido.itens || [])
      .map(it => idPorCod[it.cod] ? { produtoId: idPorCod[it.cod], qty: it.qty } : null)
      .filter(Boolean)

    const ehNovo = !pedido.id
    const payload = {
      ...(pedido.id ? { id: pedido.id } : { data_pedido: new Date().toISOString() }),
      org_id: org.id,
      periodo_id: periodo.id,
      cliente_nome: pedido.nome,
      cliente_tel: pedido.telefone,
      unidade: pedido.unidade,
      itens: itensConvertidos,
      pagamento: pedido.pagamento,
      total: pedido.total,
      status: pedido.status || 'pendente',
      origem: 'catalogo',
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabaseAdmin
      .from('korin_pedidos')
      .upsert(payload, { onConflict: 'id' })
      .select('id, status').maybeSingle()
    if (error) throw error

    await notificarPedido(org.id, { ehNovo, nome: pedido.nome, total: pedido.total })

    return res.status(200).json({ ok: true, data: { ...pedido, id: data.id, status: data.status } })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
