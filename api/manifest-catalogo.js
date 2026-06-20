// api/manifest-catalogo.js — Vercel Serverless Function
// O manifest precisa de scope/start_url únicos por organização para o PWA
// instalar corretamente cada catálogo isolado. Manifest estático não suporta isso.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { slug } = req.query
  if (!slug) return res.status(400).json({ error: 'slug obrigatório' })

  let nome = 'Clube de Compras'
  try {
    const { data } = await supabaseAdmin.from('organizacoes').select('nome').eq('slug', slug).maybeSingle()
    if (data?.nome) nome = data.nome
  } catch {}

  const scope = `/${slug}/pedido`
  res.setHeader('Content-Type', 'application/manifest+json')
  res.setHeader('Cache-Control', 'public, max-age=300')
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
