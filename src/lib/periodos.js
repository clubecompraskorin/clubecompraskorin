/**
 * periodos.js — Fonte única da verdade para "qual é o mês corrente" e para
 * o catálogo de produtos congelado de cada mês.
 *
 * Regras de negócio (não mudar sem confirmar com o Júnior):
 *  - Cada período tem sua própria cópia de produtos (tabela periodo_produtos).
 *  - "Corrente" é o período pra onde caem pedidos novos (admin e catálogo web).
 *  - Arquivar é manual (aba Fechamento) e não cria período novo automaticamente.
 *  - Período arquivado só aceita escrita depois de desarquivado.
 */
import { supabase } from './supabase'

// ── MAPEAMENTO DB (snake_case) ↔ APP (camelCase) ─────────────────────────────
const produtoFromDb = (row) => ({
  id: row.id,
  cod: row.cod,
  nome: row.nome,
  preco: Number(row.preco) || 0,
  precoCusto: row.preco_custo != null ? Number(row.preco_custo) : null,
  unidade: row.unidade || '',
  categoria: row.categoria || '',
  qtdCaixa: row.qtd_caixa || 0,
  caixasAbertas: row.caixas_abertas || 0,
})

const produtoToDb = (periodoId, p) => ({
  periodo_id: periodoId,
  cod: p.cod,
  nome: p.nome,
  preco: p.preco,
  preco_custo: p.precoCusto ?? null,
  unidade: p.unidade || null,
  categoria: p.categoria || null,
  qtd_caixa: p.qtdCaixa || null,
  caixas_abertas: p.caixasAbertas || null,
})

// ── PERÍODOS ──────────────────────────────────────────────────────────────────
export async function getPeriodoCorrente(orgId) {
  if (!supabase || !orgId) return null
  const { data, error } = await supabase
    .from('periodos').select('*').eq('org_id', orgId).eq('is_corrente', true).maybeSingle()
  if (error) { console.error(error); return null }
  return data
}

export async function getPeriodoPorId(id) {
  if (!supabase || !id) return null
  const { data, error } = await supabase.from('periodos').select('*').eq('id', id).maybeSingle()
  if (error) { console.error(error); return null }
  return data
}

export async function listarPeriodos(orgId) {
  if (!supabase || !orgId) return []
  const { data, error } = await supabase
    .from('periodos').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return data || []
}

/** Cria período novo (copiando produtos do corrente atual) e promove a corrente. */
export async function criarPeriodoComCopia(orgId, nome, dataLimite) {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { data, error } = await supabase.rpc('criar_periodo_com_copia', {
      p_org_id: orgId, p_nome: nome, p_data_limite: dataLimite,
    })
    if (error) throw error
    return { ok: true, periodoId: data }
  } catch (e) { return { ok: false, error: e.message } }
}

export async function arquivarPeriodo(periodoId) {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { error } = await supabase.rpc('arquivar_periodo', { p_periodo_id: periodoId })
    if (error) throw error
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

export async function desarquivarPeriodo(periodoId) {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { error } = await supabase.rpc('desarquivar_periodo', { p_periodo_id: periodoId })
    if (error) throw error
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

/** Atualiza atributos simples do período (catálogo aberto/fechado, data limite). */
export async function atualizarPeriodo(periodoId, campos) {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { error } = await supabase.from('periodos').update(campos).eq('id', periodoId)
    if (error) throw error
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

// ── PRODUTOS DO PERÍODO ───────────────────────────────────────────────────────
export async function getProdutosDoPeriodo(periodoId) {
  if (!supabase || !periodoId) return []
  const { data, error } = await supabase
    .from('periodo_produtos').select('*').eq('periodo_id', periodoId).order('cod', { ascending: true })
  if (error) { console.error(error); return [] }
  return (data || []).map(produtoFromDb)
}

/** Cria ou atualiza um único produto (ajuste avulso dentro do período corrente). */
export async function salvarProdutoNoPeriodo(periodoId, produtoApp) {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const payload = produtoToDb(periodoId, produtoApp)
    if (produtoApp.id) payload.id = produtoApp.id
    const { data, error } = await supabase
      .from('periodo_produtos').upsert(payload, { onConflict: produtoApp.id ? 'id' : 'periodo_id,cod' })
      .select().maybeSingle()
    if (error) throw error
    return { ok: true, produto: produtoFromDb(data) }
  } catch (e) { return { ok: false, error: e.message } }
}

export async function removerProdutoDoPeriodo(produtoId) {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { error } = await supabase.from('periodo_produtos').delete().eq('id', produtoId)
    if (error) throw error
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

/**
 * Substitui completamente os produtos de um período pela lista informada
 * (usado pela importação de catálogo por foto/IA). Remove o que não está
 * na lista nova e faz upsert do resto, casando por `cod`.
 */
export async function substituirProdutosDoPeriodo(periodoId, produtosApp) {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { data: existentes, error: e1 } = await supabase
      .from('periodo_produtos').select('id, cod').eq('periodo_id', periodoId)
    if (e1) throw e1

    const codsNovos = new Set(produtosApp.map(p => p.cod))
    const aRemover = (existentes || []).filter(e => !codsNovos.has(e.cod)).map(e => e.id)
    if (aRemover.length) {
      const { error: e2 } = await supabase.from('periodo_produtos').delete().in('id', aRemover)
      if (e2) throw e2
    }

    const payload = produtosApp.map(p => produtoToDb(periodoId, p))
    const { data, error: e3 } = await supabase
      .from('periodo_produtos').upsert(payload, { onConflict: 'periodo_id,cod' }).select()
    if (e3) throw e3

    return { ok: true, produtos: (data || []).map(produtoFromDb) }
  } catch (e) { return { ok: false, error: e.message } }
}
