// api/entrega-lista.js — Vercel Serverless Function
// Lista de pedidos de uma unidade pro representante separar/entregar, sem
// login completo — validado por PIN por unidade (org_unidades.pin_entrega).
// Usa service_role porque org_unidades e korin_pedidos não têm policy
// pública pra esse caso (RLS exige is_org_member).

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { slug, unidadeId, pin } = req.body
  if (!slug || !unidadeId || !pin) return res.status(400).json({ ok: false, error: 'slug, unidadeId e pin são obrigatórios' })

  try {
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizacoes').select('id, ativo, nome').eq('slug', slug).maybeSingle()
    if (orgError) throw orgError
    if (!org || !org.ativo) return res.status(404).json({ ok: false, error: 'Organização não encontrada ou inativa' })

    const { data: unidade, error: uniError } = await supabaseAdmin
      .from('org_unidades').select('id, nome, pin_entrega').eq('id', unidadeId).eq('org_id', org.id).maybeSingle()
    if (uniError) throw uniError
    if (!unidade || !unidade.pin_entrega || unidade.pin_entrega !== String(pin)) {
      return res.status(401).json({ ok: false, error: 'PIN inválido' })
    }

    const { data: periodo, error: perError } = await supabaseAdmin
      .from('periodos').select('id, nome').eq('org_id', org.id).eq('is_corrente', true).maybeSingle()
    if (perError) throw perError
    if (!periodo) return res.status(404).json({ ok: false, error: 'Nenhum período configurado para este grupo' })

    const { data: produtos, error: prodError } = await supabaseAdmin
      .from('periodo_produtos').select('id, cod, nome, preco').eq('periodo_id', periodo.id).order('cod', { ascending: true })
    if (prodError) throw prodError

    const { data: pedidos, error: pedError } = await supabaseAdmin
      .from('korin_pedidos')
      .select('id, cliente_nome, cliente_tel, unidade, pagamento, itens, status, data_pedido, data_entrega, entregue_por, troco, obs, total')
      .eq('org_id', org.id).eq('periodo_id', periodo.id).eq('unidade', unidade.nome)
      .neq('status', 'cancelado')
      .order('data_pedido', { ascending: false })
    if (pedError) throw pedError

    return res.status(200).json({
      ok: true,
      org: { nome: org.nome },
      unidade: { id: unidade.id, nome: unidade.nome },
      periodo: { nome: periodo.nome },
      produtos: produtos || [],
      pedidos: (pedidos || []).map(p => ({
        id: p.id,
        clienteNome: p.cliente_nome,
        clienteTel: p.cliente_tel || '',
        unidade: p.unidade || '',
        pagamento: p.pagamento || 'A Definir',
        itens: p.itens || [],
        status: p.status || 'pendente',
        dataPedido: p.data_pedido,
        dataEntrega: p.data_entrega || null,
        entreguePor: p.entregue_por || null,
        troco: p.troco != null ? Number(p.troco) : null,
        obs: p.obs || null,
        total: p.total != null ? Number(p.total) : null,
      })),
    })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
