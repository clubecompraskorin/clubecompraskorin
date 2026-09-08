// api/gestor-fotos.js — Vercel Serverless Function
// Popula o banco compartilhado de fotos (fotos_produtos_korin) -- nenhuma
// organização tem acesso a isso, é sempre o Junior (via /gestor -> aba
// Fotos) ou eu direto por API.
//
// POST { nomeKorin, cod?, urlOrigem } -> baixa urlOrigem (foto já publicada
//   em algum site) e re-hospeda. Existe porque o sandbox de desenvolvimento
//   não tem rota de rede pro site da Korin, mas a Vercel tem internet livre.
// POST { nomeKorin, cod?, imagemBase64, mimeType } -> sobe o arquivo que o
//   Junior escolheu direto no /gestor (upload de verdade, sem precisar de
//   link pronto em outro site).
//
// Autenticação: token estático (CRON_SECRET, pra automação/chamada direta
// por API) OU sessão de platform_admin (Bearer <access_token>, pro uso via
// /gestor -- mesmo padrão de validação direto na API REST do GoTrue usado
// em api/dedicante.js, sem depender do supabase-js/.auth.getUser()).
//
// `cod` é opcional mas sempre que der pra informar é o casamento primário
// (número real da Korin, igual em qualquer planilha) -- nome normalizado
// só é usado como reserva quando não tem código.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const normalizar = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const slugify = (s) => (s || 'produto').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

async function autenticado(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token && token === process.env.CRON_SECRET) return true

  if (!token) return false
  try {
    const resp = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.VITE_SUPABASE_ANON_KEY },
    })
    if (!resp.ok) return false
    const userData = await resp.json()
    if (!userData?.email) return false
    const { data } = await supabaseAdmin
      .from('platform_admins').select('email').ilike('email', userData.email).maybeSingle()
    return Boolean(data)
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!(await autenticado(req))) return res.status(401).json({ ok: false, error: 'Não autorizado' })

  const { nomeKorin, cod, urlOrigem, imagemBase64, mimeType } = req.body || {}
  if (!nomeKorin) return res.status(400).json({ ok: false, error: 'nomeKorin é obrigatório' })
  if (!urlOrigem && !imagemBase64) return res.status(400).json({ ok: false, error: 'Envie urlOrigem ou imagemBase64' })
  const codNumero = cod != null && cod !== '' ? Number(cod) : null
  if (cod != null && cod !== '' && !Number.isInteger(codNumero)) {
    return res.status(400).json({ ok: false, error: 'cod precisa ser um número inteiro' })
  }

  try {
    let buffer, contentType
    if (imagemBase64) {
      if (!MIME_EXT[mimeType]) return res.status(400).json({ ok: false, error: 'Formato de imagem não suportado (use JPG, PNG, WEBP ou GIF)' })
      buffer = Buffer.from(imagemBase64, 'base64')
      if (buffer.length > 4 * 1024 * 1024) return res.status(400).json({ ok: false, error: 'Imagem muito grande (máximo 4MB) -- comprima e tente de novo' })
      contentType = mimeType
    } else {
      const imgRes = await fetch(urlOrigem)
      if (!imgRes.ok) throw new Error(`Falha ao baixar imagem de origem (${imgRes.status})`)
      contentType = imgRes.headers.get('content-type') || 'image/png'
      buffer = Buffer.from(await imgRes.arrayBuffer())
    }
    const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('webp') ? 'webp' : contentType.includes('gif') ? 'gif' : 'png'
    const path = `korin/${slugify(nomeKorin)}.${ext}`

    const { error: upErr } = await supabaseAdmin.storage.from('produto-fotos').upload(path, buffer, { contentType, upsert: true })
    if (upErr) throw upErr

    const { data: pub } = supabaseAdmin.storage.from('produto-fotos').getPublicUrl(path)

    // Com código informado, o upsert casa por código -- é a chave forte agora
    // (2 nomes ligeiramente diferentes pro mesmo produto não viram 2 linhas).
    // Sem código, cai pro comportamento antigo (casa por nome normalizado).
    const { error: dbErr } = await supabaseAdmin.from('fotos_produtos_korin').upsert({
      cod: codNumero,
      nome_korin_normalizado: normalizar(nomeKorin),
      nome_korin_original: nomeKorin,
      url_foto: pub.publicUrl,
      fonte: imagemBase64 ? 'upload-gestor' : 'korin-site',
      atualizado_em: new Date().toISOString(),
    }, { onConflict: codNumero != null ? 'cod' : 'nome_korin_normalizado' })
    if (dbErr) throw dbErr

    return res.status(200).json({ ok: true, url: pub.publicUrl })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
