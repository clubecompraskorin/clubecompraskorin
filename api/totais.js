// api/totais.js — Vercel Serverless Function
// Retorna só o agregado {cod: quantidade} de um período (por periodoId),
// considerando apenas pedidos vindos do catálogo (igual ao comportamento
// anterior — pedido manual nunca contou pra disponibilidade pública).
// Nunca expõe nome/telefone de outros clientes.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { slug, periodoId } = req.query
  if (!slug || !periodoId) return res.status(400).json({ ok: false, error: 'slug e periodoId são obrigatórios' })

  try {
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizacoes').select('id').eq('slug', slug).maybeSingle()
    if (orgError) throw orgError
    if (!org) return res.status(404).json({ ok: false, error: 'Organização não encontrada' })

    const { data, error } = await supabaseAdmin
      .from('korin_pedidos').select('itens, status')
      .eq('org_id', org.id).eq('periodo_id', periodoId).eq('origem', 'catalogo')
    if (error) throw error

    const { data: produtosPeriodo } = await supabaseAdmin
      .from('periodo_produtos').select('id, cod').eq('periodo_id', periodoId)
    const codPorId = {}
    ;(produtosPeriodo || []).forEach(p => { codPorId[p.id] = p.cod })

    const totais = {}
    ;(data || [])
      .filter(p => p.status !== 'cancelado')
      .forEach(p => (p.itens || []).forEach(it => {
        const cod = codPorId[it.produtoId]
        if (cod != null) totais[cod] = (totais[cod] || 0) + it.qty
      }))

    return res.status(200).json({ ok: true, totais })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
