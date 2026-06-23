// api/pedido.js — Vercel Serverless Function
// Único ponto de escrita em korin_pedidos_web. Usa service_role porque
// a tabela não tem mais policy pública (cliente final não tem login).
// Valida o período corrente no servidor — nunca confia no que o cliente envia.

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

    const payload = {
      ...pedido,
      org_id: org.id,
      periodo_id: periodo.id,
      periodo: periodo.nome,
      updated_at: new Date().toISOString(),
    }
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
