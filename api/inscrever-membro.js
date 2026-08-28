// api/inscrever-membro.js — Vercel Serverless Function
// Membro (catálogo público, sem login) se inscreve pra receber aviso de
// abertura/fechamento do catálogo. service_role porque push_subscriptions_membros
// não tem policy pública — mesmo padrão de api/pedido.js.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { slug, subscription } = req.body
  if (!slug || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ ok: false, error: 'slug e subscription são obrigatórios' })
  }

  try {
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizacoes').select('id, ativo').eq('slug', slug).maybeSingle()
    if (orgError) throw orgError
    if (!org || !org.ativo) return res.status(404).json({ ok: false, error: 'Organização não encontrada ou inativa' })

    const { error } = await supabaseAdmin.from('push_subscriptions_membros').upsert({
      org_id: org.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }, { onConflict: 'endpoint' })
    if (error) throw error

    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
