// api/meu-pedido.js — Vercel Serverless Function
// Cliente final consulta o próprio pedido pelo telefone. service_role bypassa
// RLS, mas o filtro por telefone+org garante que só vê o pedido dele.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { slug, telefone, periodo } = req.query
  if (!slug || !telefone || !periodo) {
    return res.status(400).json({ ok: false, error: 'slug, telefone e periodo são obrigatórios' })
  }

  try {
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizacoes').select('id').eq('slug', slug).maybeSingle()
    if (orgError) throw orgError
    if (!org) return res.status(404).json({ ok: false, error: 'Organização não encontrada' })

    const { data, error } = await supabaseAdmin
      .from('korin_pedidos_web').select('*')
      .eq('org_id', org.id).eq('telefone', telefone).eq('periodo', periodo)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error

    return res.status(200).json({ ok: true, data })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
