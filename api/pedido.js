// api/pedido.js — Vercel Serverless Function
// Único ponto de escrita em korin_pedidos_web. Usa service_role porque
// a tabela não tem mais policy pública (cliente final não tem login).

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { slug, pedido } = req.body
  if (!slug || !pedido) return res.status(400).json({ ok: false, error: 'slug e pedido são obrigatórios' })

  try {
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizacoes').select('id, ativo').eq('slug', slug).maybeSingle()
    if (orgError) throw orgError
    if (!org || !org.ativo) return res.status(404).json({ ok: false, error: 'Organização não encontrada ou inativa' })

    const payload = { ...pedido, org_id: org.id, updated_at: new Date().toISOString() }
    const { data, error } = await supabaseAdmin
      .from('korin_pedidos_web')
      .upsert(payload, { onConflict: 'id' })
      .select().maybeSingle()
    if (error) throw error

    return res.status(200).json({ ok: true, data })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
