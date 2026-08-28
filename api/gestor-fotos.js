// api/gestor-fotos.js — Vercel Serverless Function
// Só eu (Junior) chamo isso diretamente pra popular o banco compartilhado de
// fotos -- nenhuma organização tem acesso a isso, não tem UI de cliente
// nenhuma apontando aqui. Existe justamente porque o sandbox de
// desenvolvimento não tem rota de rede pro site da Korin, mas a Vercel tem
// internet livre -- então a function faz o download+re-host, não o
// ambiente de dev.
//
// POST { nomeKorin, urlOrigem } -> baixa urlOrigem, sobe pro Storage
// (bucket produto-fotos, pasta korin/), grava em fotos_produtos_korin
// casando por nome normalizado (mesma normalização usada no import pra
// detectar código reaproveitado: só A-Z0-9 maiúsculo).

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const normalizar = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const slugify = (s) => (s || 'produto').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'Não autorizado' })
  }

  const { nomeKorin, urlOrigem } = req.body
  if (!nomeKorin || !urlOrigem) return res.status(400).json({ ok: false, error: 'nomeKorin e urlOrigem são obrigatórios' })

  try {
    const imgRes = await fetch(urlOrigem)
    if (!imgRes.ok) throw new Error(`Falha ao baixar imagem de origem (${imgRes.status})`)
    const contentType = imgRes.headers.get('content-type') || 'image/png'
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : contentType.includes('gif') ? 'gif' : 'png'
    const path = `korin/${slugify(nomeKorin)}.${ext}`

    const { error: upErr } = await supabaseAdmin.storage.from('produto-fotos').upload(path, buffer, { contentType, upsert: true })
    if (upErr) throw upErr

    const { data: pub } = supabaseAdmin.storage.from('produto-fotos').getPublicUrl(path)

    const { error: dbErr } = await supabaseAdmin.from('fotos_produtos_korin').upsert({
      nome_korin_normalizado: normalizar(nomeKorin),
      nome_korin_original: nomeKorin,
      url_foto: pub.publicUrl,
      fonte: 'korin-site',
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'nome_korin_normalizado' })
    if (dbErr) throw dbErr

    return res.status(200).json({ ok: true, url: pub.publicUrl })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
