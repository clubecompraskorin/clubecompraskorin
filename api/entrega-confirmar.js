// api/entrega-confirmar.js — Vercel Serverless Function
// Confirma a entrega de um pedido feita pelo representante da unidade
// (sem login completo) — mesma revalidação de PIN do api/entrega-lista.js.
// Grava quem confirmou em korin_pedidos.entregue_por.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { slug, unidadeId, pin, pedidoId, entreguePor, itens, pagamento, troco, obs } = req.body
  if (!slug || !unidadeId || !pin || !pedidoId || !entreguePor?.trim()) {
    return res.status(400).json({ ok: false, error: 'Dados obrigatórios faltando' })
  }

  try {
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizacoes').select('id, ativo').eq('slug', slug).maybeSingle()
    if (orgError) throw orgError
    if (!org || !org.ativo) return res.status(404).json({ ok: false, error: 'Organização não encontrada ou inativa' })

    const { data: unidade, error: uniError } = await supabaseAdmin
      .from('org_unidades').select('id, nome, pin_entrega').eq('id', unidadeId).eq('org_id', org.id).maybeSingle()
    if (uniError) throw uniError
    if (!unidade || !unidade.pin_entrega || unidade.pin_entrega !== String(pin)) {
      return res.status(401).json({ ok: false, error: 'PIN inválido' })
    }

    const { data: periodo, error: perError } = await supabaseAdmin
      .from('periodos').select('id').eq('org_id', org.id).eq('is_corrente', true).maybeSingle()
    if (perError) throw perError
    if (!periodo) return res.status(404).json({ ok: false, error: 'Nenhum período configurado para este grupo' })

    // Confere que o pedido é mesmo dessa unidade/período/organização antes de
    // alterar — o representante só pode confirmar entrega da própria unidade.
    const { data: pedido, error: pedError } = await supabaseAdmin
      .from('korin_pedidos').select('id, status, unidade')
      .eq('id', pedidoId).eq('org_id', org.id).eq('periodo_id', periodo.id).maybeSingle()
    if (pedError) throw pedError
    if (!pedido || pedido.unidade !== unidade.nome) {
      return res.status(404).json({ ok: false, error: 'Pedido não encontrado para essa unidade' })
    }
    if (pedido.status === 'cancelado') {
      return res.status(403).json({ ok: false, error: 'Pedido cancelado' })
    }

    const payload = {
      status: 'entregue',
      data_entrega: new Date().toISOString(),
      entregue_por: entreguePor.trim(),
      updated_at: new Date().toISOString(),
    }
    if (Array.isArray(itens)) payload.itens = itens
    if (pagamento) payload.pagamento = pagamento
    if (troco !== undefined) payload.troco = (troco === '' || troco == null) ? null : troco
    if (obs !== undefined) payload.obs = obs || null

    const { data, error } = await supabaseAdmin
      .from('korin_pedidos').update(payload).eq('id', pedidoId).select().maybeSingle()
    if (error) throw error

    return res.status(200).json({ ok: true, data })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
