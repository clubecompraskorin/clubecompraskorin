/**
 * pdv.js — Alocação de estoque por unidade pro modo PDV (venda rápida em
 * feira/culto) e leitura do estoque restante ali.
 *
 * Importante: a Korin vende só pra organização inteira — não existe uma
 * "segunda compra" por unidade. `alocado_und` é só "quanto desse total a
 * Dedicante decidiu levar pra essa unidade vender no local", puramente
 * informativo. Nunca trava uma venda; só orienta.
 */
import { supabase } from './supabase'

// { [periodoProdutoId]: alocadoUnd } — só os produtos que já têm alocação
// definida pra essa unidade nesse período.
export async function getAlocacoesUnidade(periodoId, unidadeId) {
  if (!supabase || !periodoId || !unidadeId) return {}
  try {
    const { data, error } = await supabase
      .from('unidade_estoque_pdv')
      .select('alocado_und, periodo_produtos!inner(id, periodo_id)')
      .eq('unidade_id', unidadeId)
      .eq('periodo_produtos.periodo_id', periodoId)
    if (error) throw error
    const mapa = {}
    ;(data || []).forEach(row => { mapa[row.periodo_produtos.id] = row.alocado_und })
    return mapa
  } catch (e) { console.error(e); return {} }
}

export async function definirAlocacao(periodoProdutoId, unidadeId, alocadoUnd) {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { error } = await supabase
      .from('unidade_estoque_pdv')
      .upsert(
        { periodo_produto_id: periodoProdutoId, unidade_id: unidadeId, alocado_und: Math.max(0, alocadoUnd), updated_at: new Date().toISOString() },
        { onConflict: 'periodo_produto_id,unidade_id' }
      )
    if (error) throw error
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

// Soma vendida via PDV, por produtoId, só dessa unidade — calculado ao vivo
// em cima dos pedidos já carregados (mesmo padrão de getTotaisPorProduto),
// não um contador redundante que poderia dessincronizar.
export function getVendidoPdvPorProduto(pedidos, unidadeNome) {
  const t = {}
  pedidos
    .filter(p => p.origem === 'pdv' && p.status !== 'cancelado' && p.unidade === unidadeNome)
    .forEach(p => p.itens.forEach(it => { t[it.produtoId] = (t[it.produtoId] || 0) + it.qty }))
  return t
}
