// api/meu-pedido.js — Vercel Serverless Function
// Cliente final consulta o próprio pedido pelo telefone, escopado ao período
// corrente (periodoId). service_role bypassa RLS, mas o filtro por
// org+telefone+periodo+origem garante que só vê o pedido dele, do mês certo.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { slug, telefone, periodoId } = req.query
  if (!slug || !telefone || !periodoId) {
    return res.status(400).json({ ok: false, error: 'slug, telefone e periodoId são obrigatórios' })
  }

  try {
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizacoes').select('id').eq('slug', slug).maybeSingle()
    if (orgError) throw orgError
    if (!org) return res.status(404).json({ ok: false, error: 'Organização não encontrada' })

    const { data: row, error } = await supabaseAdmin
      .from('korin_pedidos').select('*')
      .eq('org_id', org.id).eq('cliente_tel', telefone).eq('periodo_id', periodoId).eq('origem', 'catalogo')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    if (!row) return res.status(200).json({ ok: true, data: null })

    // korin_pedidos guarda itens por produtoId — devolve por código (formato do catálogo).
    const { data: produtosPeriodo } = await supabaseAdmin
      .from('periodo_produtos').select('id, cod, nome, unidade, preco').eq('periodo_id', periodoId)
    const porId = {}
    ;(produtosPeriodo || []).forEach(p => { porId[p.id] = p })

    const itens = (row.itens || [])
      .map(it => { const p = porId[it.produtoId]; return p ? { cod: p.cod, nome: p.nome, unidade: p.unidade, preco: Number(p.preco), qty: it.qty } : null })
      .filter(Boolean)

    const data = {
      id: row.id, nome: row.cliente_nome, telefone: row.cliente_tel, unidade: row.unidade,
      pagamento: row.pagamento, status: row.status, itens, total: row.total,
    }

    return res.status(200).json({ ok: true, data })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
