// api/gestor-fotos.js — Vercel Serverless Function
// Só eu (Junior) chamo isso diretamente pra popular o banco compartilhado de
// fotos -- nenhuma organização tem acesso a isso, não tem UI de cliente
// nenhuma apontando aqui. Existe justamente porque o sandbox de
// desenvolvimento não tem rota de rede pro site da Korin, mas a Vercel tem
// internet livre -- então a function faz o download+re-host, não o
// ambiente de dev.
//
// POST { nomeKorin, urlOrigem, cod? } -> baixa urlOrigem, sobe pro Storage
// (bucket produto-fotos, pasta korin/), grava em fotos_produtos_korin
// casando por nome normalizado (mesma normalização usada no import pra
// detectar código reaproveitado: só A-Z0-9 maiúsculo). `cod` é opcional
// mas sempre que der pra informar (é o mesmo código real da Korin que
// aparece do lado do nome no site/tabela) -- é o casamento primário no
// app, o nome normalizado só é usado como reserva.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const normalizar = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
const slugify = (s) => (s || 'produto').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

export default async function handler(req, res) {
  const dados = req.method === 'GET' ? req.query : (req.method === 'POST' ? req.body : null)
  if (!dados) return res.status(405).end()

  const token = req.method === 'GET' ? dados.token : req.headers.authorization?.replace('Bearer ', '')
  if (token !== process.env.CRON_SECRET) {
    return res.status(401).json({ ok: false, error: 'Não autorizado' })
  }

  const { nomeKorin, urlOrigem, cod } = dados
  if (!nomeKorin || !urlOrigem) return res.status(400).json({ ok: false, error: 'nomeKorin e urlOrigem são obrigatórios' })
  const codNumero = cod != null && cod !== '' ? Number(cod) : null
  if (cod != null && cod !== '' && !Number.isInteger(codNumero)) {
    return res.status(400).json({ ok: false, error: 'cod precisa ser um número inteiro' })
  }

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

    // Com código informado, o upsert casa por código -- é a chave forte agora
    // (2 nomes ligeiramente diferentes pro mesmo produto não viram 2 linhas).
    // Sem código, cai pro comportamento antigo (casa por nome normalizado).
    const { error: dbErr } = await supabaseAdmin.from('fotos_produtos_korin').upsert({
      cod: codNumero,
      nome_korin_normalizado: normalizar(nomeKorin),
      nome_korin_original: nomeKorin,
      url_foto: pub.publicUrl,
      fonte: 'korin-site',
      atualizado_em: new Date().toISOString(),
    }, { onConflict: codNumero != null ? 'cod' : 'nome_korin_normalizado' })
    if (dbErr) throw dbErr

    return res.status(200).json({ ok: true, url: pub.publicUrl })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
