// api/totais.js — Vercel Serverless Function
// Retorna só o agregado {cod: quantidade} de um período (por periodoId).
// Nunca expõe nome/telefone de outros clientes — é o que o catálogo público
// precisa pra saber quanto já foi vendido, sem vazar dados pessoais de terceiros.

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
      .from('korin_pedidos_web').select('itens, status')
      .eq('org_id', org.id).eq('periodo_id', periodoId)
    if (error) throw error

    const totais = {}
    ;(data || [])
      .filter(p => p.status !== 'cancelado')
      .forEach(p => (p.itens || []).forEach(it => { totais[it.cod] = (totais[it.cod] || 0) + it.qty }))

    return res.status(200).json({ ok: true, totais })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
