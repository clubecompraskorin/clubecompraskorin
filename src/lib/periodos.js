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
import { getPedidos, getTotaisPorProduto } from './store'

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
  foraDaTabela: row.fora_da_tabela || false,
  compraConfirmadaUnd: row.compra_confirmada_und ?? null,
})

// compra_confirmada_und deliberadamente FORA daqui — esse upsert é usado por
// qualquer edição comum de produto (config de embalagem, reimportar
// catálogo), e omitir a coluna faz o upsert preservar o valor já gravado em
// vez de sobrescrever com null. Só registrarCompraConfirmada() escreve nela.
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
  fora_da_tabela: p.foraDaTabela || false,
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

/**
 * IDs de periodo_produtos referenciados por pedidos ainda ativos (status
 * diferente de 'cancelado') do período. Não existe FK no banco amarrando
 * korin_pedidos.itens (jsonb) a periodo_produtos — sem essa checagem,
 * remover um produto com pedido em aberto faz o item sumir da tela do
 * pedido e o total cair sozinho, sem erro nenhum pra coordenadora.
 */
async function produtosVinculadosAPedidos(periodoId) {
  const { data, error } = await supabase
    .from('korin_pedidos').select('itens').eq('periodo_id', periodoId).neq('status', 'cancelado')
  if (error) throw error
  const ids = new Set()
  for (const pedido of data || []) {
    for (const it of pedido.itens || []) if (it.produtoId) ids.add(it.produtoId)
  }
  return ids
}

export async function removerProdutoDoPeriodo(produtoId, periodoId) {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const vinculados = await produtosVinculadosAPedidos(periodoId)
    if (vinculados.has(produtoId)) {
      return { ok: false, error: 'Este produto está em um pedido ainda não cancelado — não pode ser removido.' }
    }
    const { error } = await supabase.from('periodo_produtos').delete().eq('id', produtoId)
    if (error) throw error
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
}

/**
 * Substitui completamente os produtos de um período pela lista informada
 * (usado pela importação de catálogo por foto/planilha). Remove o que não
 * está na lista nova e faz upsert do resto, casando por `cod` — exceto
 * produto com pedido ainda ativo vinculado, que é mantido mesmo fora da
 * lista nova (ver produtosVinculadosAPedidos) e marcado `fora_da_tabela`
 * pra ficar visível na tela da coordenadora que ele não veio mais na
 * última importação. Todo produto que VEM na lista nova sai com
 * `fora_da_tabela = false` (produtoToDb), inclusive se ele tinha sido
 * marcado numa importação anterior e voltou a aparecer.
 */
export async function substituirProdutosDoPeriodo(periodoId, produtosApp) {
  if (!supabase) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { data: existentes, error: e1 } = await supabase
      .from('periodo_produtos').select('id, cod').eq('periodo_id', periodoId)
    if (e1) throw e1

    const codsNovos = new Set(produtosApp.map(p => p.cod))
    const candidatosRemocao = (existentes || []).filter(e => !codsNovos.has(e.cod))

    const vinculados = await produtosVinculadosAPedidos(periodoId)
    const aRemover = candidatosRemocao.filter(e => !vinculados.has(e.id)).map(e => e.id)
    const aMarcarForaDaTabela = candidatosRemocao.filter(e => vinculados.has(e.id)).map(e => e.id)
    const mantidosPorPedido = aMarcarForaDaTabela.length

    if (aRemover.length) {
      const { error: e2 } = await supabase.from('periodo_produtos').delete().in('id', aRemover)
      if (e2) throw e2
    }

    if (aMarcarForaDaTabela.length) {
      const { error: e2b } = await supabase
        .from('periodo_produtos').update({ fora_da_tabela: true }).in('id', aMarcarForaDaTabela)
      if (e2b) throw e2b
    }

    const payload = produtosApp.map(p => produtoToDb(periodoId, p))
    const { data, error: e3 } = await supabase
      .from('periodo_produtos').upsert(payload, { onConflict: 'periodo_id,cod' }).select()
    if (e3) throw e3

    return { ok: true, produtos: (data || []).map(produtoFromDb), mantidosPorPedido }
  } catch (e) { return { ok: false, error: e.message } }
}

// ── COMPRA CONFIRMADA (planilha realmente enviada pra Korin) ────────────────
/**
 * Registra a quantidade de fato comprada da Korin (planilha enviada, não a
 * estimativa dos pedidos) — por produto, casando por `cod`. Sempre SUBSTITUI
 * o que já estava gravado pro produto naquele período (não soma): a
 * Dedicante deve reimportar uma única planilha representando a compra
 * completa do período; reimportar de novo sobrescreve a anterior.
 * `itens`: [{ cod, qtdeCaixas }].
 *
 * A Korin vende só pra organização inteira — não existe "compra por
 * unidade". A partir daqui o estoque desse produto no período passa a ser
 * esse número (ver calcEstoque em lib/helpers.js), não mais a estimativa de
 * caixas abertas — vale igual pra pedido do clube e pra venda no PDV.
 */
export async function registrarCompraConfirmada(periodoId, itens) {
  if (!supabase || !periodoId) return { ok: false, error: 'Sem conexão com internet' }
  try {
    const { data: existentes, error: e1 } = await supabase
      .from('periodo_produtos').select('id, cod, qtd_caixa').eq('periodo_id', periodoId)
    if (e1) throw e1

    const porCod = {}
    ;(existentes || []).forEach(p => { porCod[p.cod] = p })

    const atualizacoes = itens
      .map(it => {
        const prod = porCod[it.cod]
        if (!prod || !prod.qtd_caixa) return null
        return { id: prod.id, compra_confirmada_und: Math.round(it.qtdeCaixas * prod.qtd_caixa) }
      })
      .filter(Boolean)

    if (!atualizacoes.length) return { ok: false, error: 'Nenhum produto da planilha bate com o catálogo deste período' }

    const resultados = await Promise.all(atualizacoes.map(u =>
      supabase.from('periodo_produtos')
        .update({ compra_confirmada_und: u.compra_confirmada_und })
        .eq('id', u.id)
    ))
    const falhou = resultados.find(r => r.error)
    if (falhou) throw falhou.error

    return { ok: true, atualizados: atualizacoes.length }
  } catch (e) { return { ok: false, error: e.message } }
}

/**
 * Período arquivado imediatamente anterior a `periodoAtualId` (ou, se
 * `periodoAtualId` não for informado, o arquivado mais recente da org).
 * Compara por `created_at` — não só "o mais recente que não é o atual" —
 * porque ao visualizar um período histórico antigo, "mais recente" pegaria
 * o mês passado, não o mês anterior AO PERÍODO VISUALIZADO. Usado tanto
 * pela sobra quanto pelo comparativo de membros/produtos do Dashboard.
 */
async function getPeriodoAnteriorArquivado(orgId, periodoAtualId) {
  if (!supabase || !orgId) return null
  try {
    let createdAtRef = null
    if (periodoAtualId) {
      const { data: atual } = await supabase.from('periodos').select('created_at').eq('id', periodoAtualId).maybeSingle()
      createdAtRef = atual?.created_at || null
    }
    let query = supabase.from('periodos').select('id, nome').eq('org_id', orgId).eq('status', 'arquivado')
    if (periodoAtualId) query = query.neq('id', periodoAtualId)
    if (createdAtRef) query = query.lt('created_at', createdAtRef)
    const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    return data
  } catch (e) { console.error(e); return null }
}

/**
 * Sobra por produto (em unidades) do período arquivado imediatamente
 * anterior — puramente informativo, nunca usado pra travar nada. Prioriza
 * compra_confirmada_und (planilha real enviada) quando existe; senão usa a
 * mesma estimativa da tela "O que comprar" (pedidos arredondados pra caixa
 * fechada). Retorna { [cod]: sobraEmUnidades }, só com sobra > 0.
 */
export async function getSobraPeriodoAnterior(orgId, periodoAtualId) {
  if (!supabase || !orgId) return {}
  try {
    const anterior = await getPeriodoAnteriorArquivado(orgId, periodoAtualId)
    if (!anterior) return {}

    const [produtosAnt, pedidosAnt] = await Promise.all([
      getProdutosDoPeriodo(anterior.id),
      getPedidos(anterior.id),
    ])
    const totais = getTotaisPorProduto(pedidosAnt)

    const porCod = {}
    produtosAnt.forEach(p => {
      if (!p.qtdCaixa) return
      const totalPedido = totais[p.id] || 0
      const compra = p.compraConfirmadaUnd ?? (p.qtdCaixa * Math.ceil(totalPedido / p.qtdCaixa))
      const sobra = Math.max(0, compra - totalPedido)
      if (sobra > 0) porCod[p.cod] = sobra
    })
    return porCod
  } catch (e) { console.error(e); return {} }
}

/**
 * Dados crus (produtos + pedidos) do período arquivado imediatamente
 * anterior — pra tela de Fechamento montar o comparativo de membros/
 * ticket médio/produtos vendidos "mês atual × mês anterior". Devolve tudo
 * sem filtrar por unidade/origem/status: quem chama aplica o mesmo filtro
 * que já está usando no período atual, pra manter os dois lados
 * comparáveis com o que a coordenadora escolheu ver na tela.
 */
export async function getComparativoPeriodoAnterior(orgId, periodoAtualId) {
  if (!supabase || !orgId) return null
  try {
    const anterior = await getPeriodoAnteriorArquivado(orgId, periodoAtualId)
    if (!anterior) return null
    const [produtos, pedidos] = await Promise.all([
      getProdutosDoPeriodo(anterior.id),
      getPedidos(anterior.id),
    ])
    return { periodo: anterior, produtos, pedidos }
  } catch (e) { console.error(e); return null }
}
