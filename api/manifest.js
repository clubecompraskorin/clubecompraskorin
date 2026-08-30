// api/manifest.js — Vercel Serverless Function
// Manifest dinâmico do PWA — um só arquivo pra catálogo e entrega (o Hobby do
// Vercel só libera 12 functions por deploy, então isso é 2 endpoints antigos
// (manifest-catalogo.js + manifest-entrega.js) virando 1). As URLs antigas
// continuam funcionando — vercel.json reescreve /api/manifest-catalogo e
// /api/manifest-entrega pra cá, então nada muda pra quem já chama essas rotas.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { slug, u, tipo } = req.query
  if (!slug) return res.status(400).json({ error: 'slug obrigatório' })

  let nome = 'Clube de Compras'
  try {
    const { data } = await supabaseAdmin.from('organizacoes').select('nome').eq('slug', slug).maybeSingle()
    if (data?.nome) nome = data.nome
  } catch {}

  res.setHeader('Content-Type', 'application/manifest+json')
  res.setHeader('Cache-Control', 'public, max-age=300')

  if (tipo === 'entrega') {
    const scope = `/${slug}/entrega`
    // start_url carrega o id da unidade — instalado a partir do link por unidade,
    // o app precisa abrir direto nela (sem isso perderia o contexto no ícone).
    const startUrl = u ? `${scope}?u=${encodeURIComponent(u)}&source=pwa` : `${scope}?source=pwa`
    return res.status(200).json({
      name: `Entrega — ${nome}`, short_name: 'Entrega Korin', description: `Confirmar entregas — ${nome}`,
      id: `korin-entrega-${slug}-${u || 'x'}`, scope, start_url: startUrl,
      display: 'standalone', background_color: '#f5f0eb', theme_color: '#1a5c38', orientation: 'portrait',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    })
  }

  const scope = `/${slug}/pedido`
  return res.status(200).json({
    name: nome,
    short_name: nome.slice(0, 20),
    description: `Faça seu pedido — ${nome}`,
    id: `korin-catalogo-${slug}`,
    scope,
    start_url: `${scope}?source=pwa`,
    display: 'standalone',
    background_color: '#f5f0eb',
    theme_color: '#1a5c38',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  })
}
