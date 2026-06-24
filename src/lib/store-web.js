import { supabase } from './supabase'

// ── CHAVES ────────────────────────────────────────────────────────────────────
const K = { cliente: 'korin-cliente-dados' }

const local = {
  get: k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

// ── STATUS DO PERÍODO ─────────────────────────────────────────────────────────
// Recebe o registro de `periodos` (não mais um config solto). Fechado se:
// arquivado, catálogo desligado manualmente, ou passou da data limite.
export const isPeriodoFechado = (periodo) => {
  if (!periodo) return true
  if (periodo.status !== 'aberto') return true
  if (!periodo.catalogo_aberto) return true
  if (periodo.data_limite) {
    const d = new Date(periodo.data_limite); d.setHours(23, 59, 59, 999)
    if (new Date() > d) return true
  }
  return false
}

// ── DADOS DO CLIENTE (localStorage) ──────────────────────────────────────────
export const loadClienteDados = () => local.get(K.cliente) || {}
export const saveClienteDados = dados => local.set(K.cliente, dados)

// ── CLIENTE FINAL (via Vercel Functions, sem acesso direto à tabela) ────────
export const criarPedidoCliente = async (slug, pedido) => {
  try {
    const r = await fetch('/api/pedido', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, pedido }),
    })
    const json = await r.json()
    if (!r.ok || !json.ok) throw new Error(json.error || 'Falha ao salvar pedido')
    return { ok: true, data: json.data }
  } catch (e) { return { ok: false, error: e.message } }
}

export const consultarMeuPedido = async (slug, telefone, periodoId) => {
  if (!periodoId) return null
  try {
    const params = new URLSearchParams({ slug, telefone, periodoId })
    const r = await fetch(`/api/meu-pedido?${params}`)
    const json = await r.json()
    if (!r.ok || !json.ok) return null
    return json.data
  } catch { return null }
}

export const getTotaisWeb = async (slug, periodoId) => {
  if (!periodoId) return {}
  try {
    const params = new URLSearchParams({ slug, periodoId })
    const r = await fetch(`/api/totais?${params}`)
    const json = await r.json()
    if (!r.ok || !json.ok) return {}
    return json.totais
  } catch { return {} }
}

// ── ORGANIZAÇÃO (resolução de slug, leitura pública) ────────────────────────
export const resolverOrgPorSlug = async (slug) => {
  if (!supabase || !slug) return null
  try {
    const { data, error } = await supabase
      .from('organizacoes_publicas').select('id, nome, ativo').eq('slug', slug).maybeSingle()
    if (error) throw error
    return data
  } catch { return null }
}
