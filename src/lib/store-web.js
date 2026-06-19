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

export const loadConfigWeb = async () => {
  const cached = local.get(K.config)
  if (!supabase) return cached || CONFIG_PADRAO
  try {
    const { data, error } = await supabase
      .from('korin_data').select('value').eq('key', K.config).maybeSingle()
    if (error) throw error
    const config = data?.value || CONFIG_PADRAO
    local.set(K.config, config)
    return config
  } catch { return cached || CONFIG_PADRAO }
}

export const saveConfigWeb = async config => {
  local.set(K.config, config)
  if (!supabase) return false
  try {
    const { error } = await supabase.from('korin_data')
      .upsert({ key: K.config, value: config, updated_at: new Date().toISOString() })
    if (error) throw error
    return true
  } catch { return false }
}

// ── DADOS DO CLIENTE (localStorage) ──────────────────────────────────────────
export const loadClienteDados = () => local.get(K.cliente) || {}
export const saveClienteDados = dados => local.set(K.cliente, dados)

// ── PRODUTOS (do Supabase, mesmo catálogo da Valéria) ────────────────────────
export const getProdutosWeb = async () => {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('korin_data').select('value').eq('key', 'korin-produtos').maybeSingle()
    if (error) throw error
    return data?.value || []
  } catch { return [] }
}

// ── PEDIDOS WEB ───────────────────────────────────────────────────────────────
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
