import { supabase } from './supabase'

// ── CHAVES ────────────────────────────────────────────────────────────────────
const K = { config: 'korin-config-web', cliente: 'korin-cliente-dados' }

const local = {
  get: k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

// ── CONFIG ────────────────────────────────────────────────────────────────────
export const CONFIG_PADRAO = {
  aberto: false,
  data_limite: null,
  periodo: 'Junho/2026',
  produtos: {},   // { [cod]: { qtdCaixa: number, caixasAbertas: number } }
}

export const isPeriodoFechado = config => {
  if (!config?.aberto) return true
  if (config.data_limite) {
    const d = new Date(config.data_limite); d.setHours(23, 59, 59, 999)
    if (new Date() > d) return true
  }
  return false
}

export const loadConfigWeb = async (orgId) => {
  const cached = local.get(K.config)
  if (!supabase || !orgId) return cached || CONFIG_PADRAO
  try {
    const { data, error } = await supabase
      .from('korin_data').select('value').eq('org_id', orgId).eq('key', K.config).maybeSingle()
    if (error) throw error
    const config = data?.value || CONFIG_PADRAO
    local.set(K.config, config)
    return config
  } catch { return cached || CONFIG_PADRAO }
}

export const saveConfigWeb = async (orgId, config) => {
  local.set(K.config, config)
  if (!supabase || !orgId) return false
  try {
    const { error } = await supabase.from('korin_data')
      .upsert(
        { org_id: orgId, key: K.config, value: config, updated_at: new Date().toISOString() },
        { onConflict: 'org_id,key' }
      )
    if (error) throw error
    return true
  } catch { return false }
}

// ── DADOS DO CLIENTE (localStorage) ──────────────────────────────────────────
export const loadClienteDados = () => local.get(K.cliente) || {}
export const saveClienteDados = dados => local.set(K.cliente, dados)

// ── PRODUTOS (do Supabase, mesmo catálogo da Valéria) ────────────────────────
export const getProdutosWeb = async (orgId) => {
  if (!supabase || !orgId) return []
  try {
    const { data, error } = await supabase
      .from('korin_data').select('value').eq('org_id', orgId).eq('key', 'korin-produtos').maybeSingle()
    if (error) throw error
    return data?.value || []
  } catch { return [] }
}

// ── PEDIDOS WEB ───────────────────────────────────────────────────────────────
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

export const consultarMeuPedido = async (slug, telefone, periodo) => {
  try {
    const params = new URLSearchParams({ slug, telefone, periodo })
    const r = await fetch(`/api/meu-pedido?${params}`)
    const json = await r.json()
    if (!r.ok || !json.ok) return null
    return json.data
  } catch { return null }
}

export const getTotaisWeb = async (slug, periodo) => {
  try {
    const params = new URLSearchParams({ slug, periodo })
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
      .from('organizacoes').select('id, nome, ativo').eq('slug', slug).maybeSingle()
    if (error) throw error
    return data
  } catch { return null }
}

// ── ADMIN (autenticado — RLS já filtra por organização automaticamente) ────
export const getPedidosWeb = async periodo => {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('korin_pedidos_web').select('*')
      .eq('periodo', periodo).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch { return [] }
}

export const getPedidoByTelefone = async (telefone, periodo) => {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('korin_pedidos_web').select('*')
      .eq('telefone', telefone).eq('periodo', periodo)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    return data
  } catch { return null }
}

export const savePedidoWeb = async pedido => {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const payload = { ...pedido, updated_at: new Date().toISOString() }
    const { data, error } = await supabase
      .from('korin_pedidos_web')
      .upsert(payload, { onConflict: 'id' })
      .select().maybeSingle()
    if (error) throw error
    return { ok: true, data }
  } catch (e) { return { ok: false, error: e.message } }
}

export const cancelarPedidoWeb = async id => {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('korin_pedidos_web')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return true
  } catch { return false }
}

// ── TOTAIS ────────────────────────────────────────────────────────────────────
export const getTotaisPorProduto = pedidos => {
  const t = {}
  pedidos
    .filter(p => p.status !== 'cancelado')
    .forEach(p => p.itens.forEach(it => { t[it.cod] = (t[it.cod] || 0) + it.qty }))
  return t
}

export const listPeriodosWeb = async () => {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('korin_pedidos_web').select('periodo')
    if (error) throw error
    return [...new Set((data || []).map(d => d.periodo))].sort().reverse()
  } catch { return [] }
}
