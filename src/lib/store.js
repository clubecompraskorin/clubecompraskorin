/**
 * store.js — Pedidos manuais (WhatsApp/balcão), escopados por período.
 *
 * Desde a migração de período estrutural: pedidos manuais vivem em
 * `korin_pedidos_manual` (sempre com periodo_id), nunca mais num blob json
 * solto. RLS exige is_org_member + periodo_editavel — por isso toda escrita
 * é uma chamada direta ao Supabase (sem fila offline: não dá pra enfileirar
 * com segurança uma escrita que depende de constraint/RLS do servidor).
 *
 * Mantém um cache local só de LEITURA (por período) pra render instantâneo
 * antes do primeiro fetch resolver.
 */
import { supabase } from './supabase'

const cacheKey = (periodoId) => `korin-pedidos-cache:${periodoId}`

const cache = {
  get: (periodoId) => {
    try { const v = localStorage.getItem(cacheKey(periodoId)); return v ? JSON.parse(v) : [] } catch { return [] }
  },
  set: (periodoId, lista) => {
    try { localStorage.setItem(cacheKey(periodoId), JSON.stringify(lista)) } catch {}
  },
}

// ── MAPEAMENTO DB ↔ APP ───────────────────────────────────────────────────────
const fromDb = (row) => ({
  id: row.id,
  clienteNome: row.cliente_nome,
  clienteTel: row.cliente_tel || '',
  unidade: row.unidade || '',
  pagamento: row.pagamento || 'A Definir',
  itens: row.itens || [],
  origem: row.origem || 'whatsapp',
  status: row.status || 'pendente',
  dataPedido: row.data_pedido,
  dataEntrega: row.data_entrega || null,
  troco: row.troco != null ? Number(row.troco) : null,
  obs: row.obs || null,
})

const toDb = (orgId, periodoId, p) => ({
  ...(p.id ? { id: p.id } : {}),
  org_id: orgId,
  periodo_id: periodoId,
  cliente_nome: p.clienteNome,
  cliente_tel: p.clienteTel || null,
  unidade: p.unidade || null,
  pagamento: p.pagamento || 'A Definir',
  itens: p.itens || [],
  origem: p.origem || 'whatsapp',
  status: p.status || 'pendente',
  data_pedido: p.dataPedido || new Date().toISOString(),
  data_entrega: p.dataEntrega || null,
  troco: p.troco ?? null,
  obs: p.obs || null,
  updated_at: new Date().toISOString(),
})

// ── LEITURA ────────────────────────────────────────────────────────────────────
export const loadCachedPedidos = (periodoId) => cache.get(periodoId)

export const getPedidosManual = async (periodoId) => {
  if (!supabase || !periodoId) return []
  try {
    const { data, error } = await supabase
      .from('korin_pedidos_manual').select('*').eq('periodo_id', periodoId)
      .order('data_pedido', { ascending: false })
    if (error) throw error
    const lista = (data || []).map(fromDb)
    cache.set(periodoId, lista)
    return lista
  } catch {
    return cache.get(periodoId)
  }
}

// ── ESCRITA ────────────────────────────────────────────────────────────────────
/** Cria ou atualiza um pedido manual. Falha se o período estiver arquivado. */
export const salvarPedidoManual = async (orgId, periodoId, pedidoApp) => {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const payload = toDb(orgId, periodoId, pedidoApp)
    const { data, error } = await supabase
      .from('korin_pedidos_manual').upsert(payload, { onConflict: 'id' })
      .select().maybeSingle()
    if (error) throw error
    return { ok: true, pedido: fromDb(data) }
  } catch (e) { return { ok: false, error: e.message } }
}

export const removerPedidoManual = async (id) => {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { error } = await supabase.from('korin_pedidos_manual').delete().eq('id', id)
    if (error) throw error
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}
