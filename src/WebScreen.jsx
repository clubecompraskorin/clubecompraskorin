import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { getPedidos, getTotaisPorProduto, getEntreguesPorProduto } from './lib/store'
import { calcEstoque, alertaCaixa, calcTotal, sortByCod } from './lib/helpers'
import { atualizarDadosOrganizacao, solicitarCancelamentoAssinatura } from './lib/auth'
import { criarCobranca, listarCobrancas } from './lib/asaas'
import {
  listarPeriodos, atualizarPeriodo, criarPeriodoComCopia,
  getProdutosDoPeriodo, salvarProdutoNoPeriodo, substituirProdutosDoPeriodo,
  getSobraPeriodoAnterior, getComprasConfirmadas, registrarAjusteManualEstoque, excluirCompraConfirmada,
} from './lib/periodos'
import { getPwaInstallCount } from './lib/pwa'
import { pushSuportado, pushJaInscrito, ativarPush, desativarPush } from './lib/push'
import { CAT_COR, CATS_ORDEM } from './lib/catalog'
import { toast, confirmar } from './lib/dialog'
import { getUnidades } from './lib/unidades'
import { ehPlanilha, parseTabelaKorin } from './lib/importarPlanilha'
import { printRelatorioPedidos, printRelatorioEstoque, printRelatorioFechamento } from './lib/print'
import UnidadesManager from './UnidadesManager'
import ClientesManager from './ClientesManager'
import { listarDedicantesUnidade, criarDedicanteUnidade, removerDedicanteUnidade } from './lib/dedicantes'
import PlanilhaKorinCard from './PlanilhaKorinCard'

const fmt = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',')
const fmtData = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : ''
const normalizarTexto = s => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// ── SUB-ABA: CONTROLES ────────────────────────────────────────────────────────
function TabControles({ periodo, dataLimite, onChangeDataLimite, onToggleAberto, onSave, onImportar, salvando, orgId, orgSlug }) {
  const linkCatalogo = window.location.origin + '/' + (orgSlug || '') + '/pedido'
  const [instalacoes, setInstalacoes] = useState(null)
  useEffect(() => { getPwaInstallCount('catalogo').then(setInstalacoes) }, [])

  const [pushAtivo, setPushAtivo] = useState(false)
  const [pushCarregando, setPushCarregando] = useState(false)
  useEffect(() => { pushJaInscrito().then(setPushAtivo) }, [])

  const toggleNotificacoes = async () => {
    setPushCarregando(true)
    const r = pushAtivo ? await desativarPush() : await ativarPush(orgId)
    setPushCarregando(false)
    if (r.ok) { setPushAtivo(!pushAtivo); toast(pushAtivo ? 'Notificações desativadas' : 'Notificações ativadas neste dispositivo') }
    else toast('Erro: ' + r.error)
  }

  return (
    <div className="space-y-5">
      {/* ── ROTINA DO MÊS ──────────────────────────────────────────────────── */}
      <div>
        <div className="text-xs font-black text-green-700 uppercase tracking-widest mb-3">🗓️ Rotina do mês</div>
        <div className="space-y-4">
          {/* Open/Close */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <div className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3">Status do período</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-black text-stone-800">{periodo.nome}</div>
                <div className={`text-base font-bold mt-0.5 ${periodo.catalogo_aberto ? 'text-green-600' : 'text-red-500'}`}>
                  {periodo.catalogo_aberto ? '🟢 Aberto para pedidos' : '🔴 Fechado'}
                </div>
              </div>
              <button onClick={onToggleAberto}
                className={`px-5 py-3 rounded-2xl font-black text-base transition-colors ${periodo.catalogo_aberto ? 'bg-red-100 text-red-700 active:bg-red-200' : 'bg-green-600 text-white active:bg-green-700'}`}>
                {periodo.catalogo_aberto ? 'Fechar' : 'Abrir'}
              </button>
            </div>
          </div>

          {/* Importar catálogo — é o que decide se vira mês novo */}
          <div>
            <button onClick={onImportar}
              className="w-full py-3.5 bg-green-50 border-2 border-green-200 text-green-800 rounded-2xl font-black text-base active:bg-green-100 flex items-center justify-center gap-2">
              📥 Importar catálogo da Korin
            </button>
            <p className="text-xs text-stone-400 mt-1.5 px-1">Importe a nova tabela de preços quando quiser virar o mês — o sistema identifica se é um mês novo e cria o período automaticamente, sem perder o histórico.</p>
          </div>

          {/* Data limite */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-3">
            <div>
              <label className="block text-sm font-bold text-stone-600 mb-1">
                Data limite para pedidos
                {dataLimite && <span className="text-stone-400 font-normal ml-1">(até {fmtData(dataLimite)})</span>}
              </label>
              <input
                type="date"
                value={dataLimite || ''}
                onChange={e => onChangeDataLimite(e.target.value || null)}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-green-500"
              />
              {dataLimite && (
                <button onClick={() => onChangeDataLimite(null)}
                  className="text-xs text-stone-400 mt-1 underline">
                  Remover data limite
                </button>
              )}
            </div>

            <button onClick={onSave} disabled={salvando}
              className="w-full py-3.5 bg-green-700 text-white rounded-2xl font-black text-base active:bg-green-800 disabled:opacity-50">
              {salvando ? '⟳ Salvando…' : '💾 Salvar configurações'}
            </button>
          </div>
        </div>
      </div>

      {/* ── CONFIGURAÇÃO AVULSA ────────────────────────────────────────────── */}
      <div>
        <div className="text-xs font-black text-green-700 uppercase tracking-widest mb-3">⚙️ Configuração avulsa</div>
        <div className="space-y-4">
          {/* Link */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <div className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3">Link para membros</div>
            <div className="bg-stone-50 rounded-xl px-3 py-2.5 text-sm font-mono text-stone-600 mb-3 break-all">
              {linkCatalogo}
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(linkCatalogo).then(() => toast('Link copiado!'))}
              className="w-full py-3 bg-stone-100 text-stone-700 rounded-xl font-bold text-base active:bg-stone-200">
              📋 Copiar link
            </button>
            {instalacoes !== null && (
              <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-3 mt-3">
                <span className="text-sm font-bold text-green-700">📲 App instalado por</span>
                <span className="text-2xl font-black text-green-700">{instalacoes}</span>
              </div>
            )}
          </div>

          {/* Notificações neste dispositivo */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <div className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3">Notificações</div>
            {!pushSuportado() ? (
              <p className="text-sm text-stone-400">Este navegador não suporta notificações. No iPhone, instale o app na tela inicial primeiro.</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-stone-700">Avisar pedido novo/alterado do catálogo</div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {pushAtivo ? '🔔 Ativado neste dispositivo' : 'Avisa aqui mesmo, com o app fechado'}
                    </div>
                  </div>
                  <button onClick={toggleNotificacoes} disabled={pushCarregando}
                    className={`px-4 py-2.5 rounded-xl font-black text-sm flex-shrink-0 transition-colors disabled:opacity-50 ${pushAtivo ? 'bg-stone-100 text-stone-600 active:bg-stone-200' : 'bg-green-600 text-white active:bg-green-700'}`}>
                    {pushCarregando ? '...' : pushAtivo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
                <p className="text-xs text-stone-400 mt-2">No iPhone, só funciona com o app instalado na tela inicial. Em outros aparelhos é por dispositivo — repita em cada um que quiser receber.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SUB-ABA: ESTOQUE ──────────────────────────────────────────────────────────
// qtdCaixa é o único dado configurado aqui (tamanho da caixa da Korin) — usado
// só pra calcular o alerta de caixa (ver alertaCaixa em lib/helpers.js), uma
// ajuda de decisão pra fase ANTES de comprar. O estoque real em si (Comprado/
// Entregue/Reservado/Sobra) só existe depois que ela confirma pelo menos uma
// compra — ver calcEstoque em lib/helpers.js.
function TabProdutos({ produtos, pedidos, onChange, onSave, salvando, somenteLeitura, sobraAnterior = {}, comprasConfirmadas = [], onComprasChange }) {
  const totais = getTotaisPorProduto(pedidos)
  const totaisEntregues = getEntreguesPorProduto(pedidos)
  const [modalHistoricoProd, setModalHistoricoProd] = useState(null)

  const confirmadoPorProdutoId = {}
  const entradasPorProdutoId = {}
  comprasConfirmadas.forEach(c => {
    confirmadoPorProdutoId[c.periodoProdutoId] = (confirmadoPorProdutoId[c.periodoProdutoId] || 0) + c.quantidadeUnd
    ;(entradasPorProdutoId[c.periodoProdutoId] ||= []).push(c)
  })

  const setProdCfg = (cod, campo, val) => {
    const n = parseInt(val) || 0
    onChange(produtos.map(p => p.cod === cod ? { ...p, [campo]: n } : p))
  }

  const cats = [...new Set([...CATS_ORDEM, ...produtos.map(p => p.categoria)])]

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-700 font-semibold">
        Configure quantas unidades vêm em cada embalagem fechada da Korin. O sistema usa isso só pra
        avisar quando a demanda não é múltiplo exato da caixa. O saldo real de estoque aparece assim
        que você confirmar a primeira compra em Fechamento.
      </div>
      {somenteLeitura && (
        <div className="bg-stone-100 border border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-500 font-semibold">
          👁️ Visualizando um período arquivado — alterações aqui não serão salvas.
        </div>
      )}

      {cats.map(cat => {
        const lista = produtos.filter(p => p.categoria === cat).sort((a, b) => a.cod - b.cod)
        if (!lista.length) return null
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COR[cat] || '#888' }} />
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: CAT_COR[cat] || '#555' }}>
                {cat}
              </span>
            </div>
            <div className="space-y-2">
              {lista.map(prod => {
                const qtdCaixa = prod.qtdCaixa || 0
                const totalPedido = totais[prod.id] || 0
                const totalEntregue = totaisEntregues[prod.id] || 0
                const sobra = sobraAnterior[prod.cod] || 0
                const confirmado = confirmadoPorProdutoId[prod.id] ?? null
                const entradas = entradasPorProdutoId[prod.id] || []
                // Não trava em 0 — negativo é sinal visual de "vendeu além do
                // comprado", decisão de quem tá gerenciando, o sistema só avisa.
                const { disponivel, restante, entregue, reservado } = calcEstoque(prod, totalPedido, sobra, confirmado, totalEntregue)
                const alerta = confirmado == null ? alertaCaixa(prod, totalPedido) : null

                return (
                  <div key={prod.id} className={`bg-white rounded-2xl border shadow-sm p-3 ${prod.foraDaTabela ? 'border-amber-300' : 'border-stone-100'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: CAT_COR[prod.categoria] || '#888' }}>
                        {prod.cod}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-stone-800 leading-tight truncate">{prod.nome}</div>
                        <div className="text-xs text-stone-400">{prod.unidade}</div>
                      </div>
                      {totalPedido > 0 && (
                        <span className="text-xs bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          {totalPedido} pedidos
                        </span>
                      )}
                    </div>
                    {prod.foraDaTabela && (
                      <div className="text-xs text-amber-700 font-bold mb-2">⚠️ Fora da última tabela importada — mantido por ter pedido em aberto</div>
                    )}

                    <div className="mb-2">
                      <label className="block text-xs font-bold text-stone-500 mb-1">Un./embalagem (tamanho da caixa da Korin)</label>
                      <input
                        type="number" min="0" value={qtdCaixa || ''}
                        disabled={somenteLeitura}
                        onChange={e => setProdCfg(prod.cod, 'qtdCaixa', e.target.value)}
                        placeholder="0 = não avisar"
                        className="w-32 border border-stone-200 rounded-xl px-3 py-2.5 text-base font-bold focus:outline-none focus:border-green-500 disabled:opacity-50"
                      />
                    </div>

                    {alerta && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-2 text-xs font-bold text-amber-700">
                        🔔 {totalPedido} pedidos pra caixa de {qtdCaixa} — {alerta.caixasCheias > 0
                          ? `${alerta.caixasCheias} caixa${alerta.caixasCheias !== 1 ? 's' : ''} cobre${alerta.caixasCheias !== 1 ? 'm' : ''} ${alerta.atendidos}, ficam ${alerta.foraDaCaixa} de fora`
                          : `nenhuma caixa fechada cobre tudo ainda, faltam ${alerta.faltamPraFecharMais} pra fechar a 1ª`}
                        . Comprar mais uma caixa atende todo mundo (sobram {qtdCaixa - alerta.foraDaCaixa} sem dono).
                      </div>
                    )}

                    {disponivel != null && (
                      <div className="bg-stone-50 rounded-xl px-3 py-2.5 space-y-1">
                        <div className="text-xs text-stone-500 font-semibold">
                          {confirmado != null ? 'Comprado' : 'Disponível'}: <b className="text-stone-700">{disponivel}</b>
                          {sobra > 0 && <span className="text-teal-700"> (inclui {sobra} de sobra do mês anterior)</span>}
                        </div>
                        <div className="text-xs text-stone-500 font-semibold">
                          Entregue: <b className="text-stone-700">{entregue}</b> · Reservado (pendente): <b className="text-stone-700">{reservado}</b>
                        </div>
                        <div className={`text-sm font-black ${restante < 0 ? 'text-red-600' : restante === 0 ? 'text-amber-600' : 'text-green-700'}`}>
                          → Sobra: {restante}{restante < 0 && ' — vendeu além do comprado'}
                        </div>
                      </div>
                    )}

                    <button onClick={() => setModalHistoricoProd(prod)}
                      className="text-xs text-stone-400 font-bold underline mt-2">
                      📋 Histórico de compras{entradas.length > 0 ? ` (${entradas.length})` : ''}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {modalHistoricoProd && (
        <ModalHistoricoCompra
          produto={modalHistoricoProd}
          entradas={entradasPorProdutoId[modalHistoricoProd.id] || []}
          somenteLeitura={somenteLeitura}
          onClose={() => setModalHistoricoProd(null)}
          onChange={onComprasChange}
        />
      )}

      {!somenteLeitura && (
        <button onClick={onSave} disabled={salvando}
          className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 disabled:opacity-50">
          {salvando ? '⟳ Salvando…' : '💾 Salvar configuração de produtos'}
        </button>
      )}
    </div>
  )
}

// ── MODAL: HISTÓRICO DE COMPRAS DE UM PRODUTO ────────────────────────────────
// Onde a Dedicante monitora e altera a compra confirmada: vê cada linha que
// compõe o "Comprado" (planilha, ajuste manual positivo ou negativo), remove
// uma errada, ou lança uma compra extra / perda sem precisar gerar planilha
// — cada lançamento SOMA (com sinal) ao estoque, nunca substitui (ver
// registrarAjusteManualEstoque em lib/periodos.js). O total em si não é
// editável direto, só as entradas.
function ModalHistoricoCompra({ produto, entradas, somenteLeitura, onClose, onChange }) {
  const [quantidade, setQuantidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(null)
  const [erro, setErro] = useState('')

  const total = entradas.reduce((s, e) => s + e.quantidadeUnd, 0)

  const adicionar = async () => {
    setErro('')
    setSalvando(true)
    const r = await registrarAjusteManualEstoque(produto.id, quantidade, observacao.trim() || null)
    setSalvando(false)
    if (!r.ok) { setErro(r.error); return }
    setQuantidade(''); setObservacao('')
    onChange?.()
  }

  const excluir = async (id) => {
    if (!await confirmar('Remover esse lançamento do histórico?')) return
    setExcluindo(id)
    const r = await excluirCompraConfirmada(id)
    setExcluindo(null)
    if (!r.ok) { toast('Erro ao remover: ' + r.error); return }
    onChange?.()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="p-4 border-b border-stone-100 flex-shrink-0 flex justify-between items-center">
          <div>
            <div className="text-xl font-black">Histórico de compras</div>
            <div className="text-sm text-stone-400">{produto.nome}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-stone-100 text-xl">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {entradas.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">Nenhum lançamento ainda pra esse produto.</div>
          ) : (
            <>
              <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-bold text-green-700">Total confirmado</span>
                <span className="text-xl font-black text-green-700">{total} un.</span>
              </div>
              {entradas.map(e => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-stone-50">
                  <div className="text-lg flex-shrink-0">{e.origem === 'planilha' ? '📊' : e.quantidadeUnd < 0 ? '📉' : '✍️'}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold ${e.quantidadeUnd < 0 ? 'text-red-600' : 'text-stone-800'}`}>
                      {e.quantidadeUnd > 0 ? '+' : ''}{e.quantidadeUnd} un.
                    </div>
                    <div className="text-xs text-stone-400">
                      {new Date(e.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {e.observacao && ` · ${e.observacao}`}
                    </div>
                  </div>
                  {!somenteLeitura && (
                    <button onClick={() => excluir(e.id)} disabled={excluindo === e.id}
                      className="p-2 rounded-xl bg-red-50 text-red-500 text-sm flex-shrink-0 disabled:opacity-50">
                      {excluindo === e.id ? '⟳' : '🗑️'}
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {!somenteLeitura && (
          <div className="p-4 border-t border-stone-100 flex-shrink-0 space-y-2">
            <div className="text-xs font-black text-stone-500 uppercase tracking-widest">Lançar compra ou ajuste</div>
            <div className="text-xs text-stone-400 -mt-1">Positivo = comprou mais · Negativo = perda/quebra</div>
            <div className="flex gap-2">
              <input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)}
                placeholder="Ex: 12 ou -3"
                className="w-32 border border-stone-200 rounded-xl px-3 py-2.5 text-base font-bold focus:outline-none focus:border-green-500" />
              <input value={observacao} onChange={e => setObservacao(e.target.value)}
                placeholder="Observação (opcional)"
                className="flex-1 min-w-0 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            {erro && <div className="text-xs text-red-600 font-semibold">{erro}</div>}
            <button onClick={adicionar} disabled={salvando || !quantidade}
              className="w-full py-3 bg-green-700 text-white rounded-2xl font-black text-sm active:bg-green-800 disabled:opacity-50">
              {salvando ? '⟳ Salvando…' : '+ Lançar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SUB-ABA: FINANCEIRO ──────────────────────────────────────────────────────
// Configuração Guiada (pagamento único) e Mensalidade (assinatura recorrente)
// via Asaas. Trava atrás do cadastro completo — servidor confere de novo em
// api/asaas-cobranca.js, isso aqui é só a experiência, não a segurança.
function TabFinanceiro({ org, unidadesCount, onIrParaDados, onSalvo }) {
  const [cobrancas, setCobrancas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(null) // 'configuracao_guiada' | 'mensalidade' | 'cancelar' | null

  useEffect(() => {
    if (!org?.orgId || !org?.cadastroCompleto) { setCarregando(false); return }
    listarCobrancas(org.orgId).then(lista => { setCobrancas(lista); setCarregando(false) })
  }, [org?.orgId, org?.cadastroCompleto])

  if (!org?.cadastroCompleto) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-6 text-center">
        <div className="text-3xl mb-2">📋</div>
        <div className="font-black text-amber-800 mb-1">Complete seu cadastro primeiro</div>
        <p className="text-sm text-amber-700 mb-4">
          Pra contratar a Configuração Guiada ou assinar a mensalidade, precisamos do seu nome e CPF/CNPJ.
        </p>
        <button onClick={onIrParaDados}
          className="px-5 py-3 bg-amber-600 text-white rounded-xl font-black text-sm active:bg-amber-700">
          Completar cadastro
        </button>
      </div>
    )
  }

  if (carregando) return <div className="text-center py-12 text-stone-400 text-sm">Carregando…</div>

  const valorMensalidade = 49.90 + Math.max(0, (unidadesCount || 1) - 1) * 9.90
  const cobrancaPendente = (tipo) => cobrancas.find(c => c.tipo === tipo && c.status === 'pendente')
  const cobrancaPaga = (tipo) => cobrancas.find(c => c.tipo === tipo && c.status === 'pago')

  const contratar = async (tipo) => {
    setProcessando(tipo)
    const r = await criarCobranca(tipo)
    setProcessando(null)
    if (!r.ok) { toast(r.error); return }
    window.open(r.link, '_blank')
    listarCobrancas(org.orgId).then(setCobrancas)
  }

  const pedirCancelamento = async () => {
    const ok = await confirmar(`Sua assinatura continua ativa até ${fmtData(org.pagoAte)}. Depois disso, o acesso é bloqueado até você reativar.\n\nConfirma o pedido de cancelamento?`)
    if (!ok) return
    setProcessando('cancelar')
    const r = await solicitarCancelamentoAssinatura(org.orgId)
    setProcessando(null)
    if (r.ok) { toast('Pedido de cancelamento enviado'); onSalvo?.() }
    else toast('Erro: ' + r.error)
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const trialAtivo = org.trialFim && hoje <= org.trialFim
  const vencidoSemPagar = org.trialFim && hoje > org.trialFim && (!org.pagoAte || hoje > org.pagoAte)
  const cgPaga = cobrancaPaga('configuracao_guiada')
  const cgPendente = cobrancaPendente('configuracao_guiada')
  const mensPendente = cobrancaPendente('mensalidade')

  return (
    <div className="space-y-4">
      {/* CONFIGURAÇÃO GUIADA */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
        <div className="text-xs font-black tracking-widest uppercase text-stone-400 mb-1">Configuração Guiada</div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-black text-stone-800">{fmt(150)}</span>
          <span className="text-sm text-stone-400">pagamento único</span>
        </div>
        <p className="text-sm text-stone-500 mb-4">A gente configura o catálogo e as unidades pra você, do zero.</p>

        {cgPaga ? (
          <div className="text-sm font-bold text-green-700">✅ Contratada em {fmtData(cgPaga.pago_em?.slice(0, 10))}</div>
        ) : cgPendente ? (
          <a href={cgPendente.link_pagamento} target="_blank" rel="noopener noreferrer"
            className="block text-center w-full py-3 bg-amber-100 text-amber-800 rounded-xl font-black text-sm">
            Pagamento pendente — continuar
          </a>
        ) : (
          <button onClick={() => contratar('configuracao_guiada')} disabled={processando === 'configuracao_guiada'}
            className="w-full py-3 bg-stone-800 text-white rounded-xl font-black text-sm active:bg-stone-900 disabled:opacity-50">
            {processando === 'configuracao_guiada' ? '⟳ Gerando...' : 'Contratar'}
          </button>
        )}
      </div>

      {/* MENSALIDADE */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
        <div className="text-xs font-black tracking-widest uppercase text-stone-400 mb-1">Mensalidade</div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-black text-stone-800">{fmt(valorMensalidade)}</span>
          <span className="text-sm text-stone-400">por mês · {unidadesCount || 1} {unidadesCount === 1 ? 'unidade' : 'unidades'}</span>
        </div>

        {org.assinaturaStatus === 'ativa' ? (
          <>
            <div className="text-sm font-bold text-green-700 mb-3">✅ Ativa até {fmtData(org.pagoAte)}</div>
            {org.cancelamentoSolicitadoEm ? (
              <div className="text-xs text-stone-500 bg-stone-50 rounded-xl px-3 py-2.5">
                Cancelamento solicitado — acesso continua até {fmtData(org.pagoAte)}.
              </div>
            ) : (
              <button onClick={pedirCancelamento} disabled={processando === 'cancelar'}
                className="text-xs text-stone-400 underline active:text-stone-600">
                Quero cancelar minha assinatura
              </button>
            )}
          </>
        ) : mensPendente ? (
          <a href={mensPendente.link_pagamento} target="_blank" rel="noopener noreferrer"
            className="block text-center w-full py-3 bg-amber-100 text-amber-800 rounded-xl font-black text-sm">
            Pagamento pendente — continuar
          </a>
        ) : (
          <>
            <div className="text-sm mb-3">
              {org.assinaturaStatus === 'cancelada' && <span className="text-stone-500">Assinatura cancelada — acesso até {fmtData(org.pagoAte)}.</span>}
              {org.assinaturaStatus === 'nunca_assinou' && trialAtivo && <span className="text-amber-600 font-semibold">Teste grátis até {fmtData(org.trialFim)}.</span>}
              {org.assinaturaStatus === 'nunca_assinou' && vencidoSemPagar && <span className="text-red-600 font-semibold">Teste encerrado — assine pra continuar.</span>}
            </div>
            <button onClick={() => contratar('mensalidade')} disabled={processando === 'mensalidade'}
              className="w-full py-3 bg-green-700 text-white rounded-xl font-black text-sm active:bg-green-800 disabled:opacity-50">
              {processando === 'mensalidade' ? '⟳ Gerando...' : org.assinaturaStatus === 'cancelada' ? 'Reativar assinatura' : 'Assinar mensalidade'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── SUB-ABA: DADOS CADASTRAIS ────────────────────────────────────────────────
// Não bloqueia nada — só guarda quem é o responsável e o documento, pra
// eventual cobrança ou integração futura. Pode ficar incompleto indefinidamente.
// ── SUB-ABA: DEDICANTES DE UNIDADE ──────────────────────────────────────────
// Só aparece quando org.permiteDedicanteUnidade está ligado (Junior liga
// manualmente por organização, ver /gestor). Cada dedicante criado aqui só
// enxerga as unidades marcadas — não vê custo, não edita produto/estoque,
// não sobe planilha, não abre/fecha o mês (tudo isso é reforçado no banco,
// esta tela é só a gestão de quem tem acesso).
function TabDedicantes({ orgId, unidades }) {
  const [lista, setLista]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [nome, setNome]           = useState('')
  const [email, setEmail]         = useState('')
  const [unidadeIds, setUnidadeIds] = useState([])
  const [criando, setCriando]     = useState(false)
  const [erro, setErro]           = useState('')
  const [senhaGerada, setSenhaGerada] = useState(null)

  const recarregar = useCallback(() => {
    if (!orgId) return
    setLoading(true)
    listarDedicantesUnidade(orgId).then(l => { setLista(l); setLoading(false) })
  }, [orgId])
  useEffect(() => { recarregar() }, [recarregar])

  // Só tem 1 unidade pra escolher — marca sozinha, sem exigir o clique extra
  // (a caixa vazia parecia já selecionada quando só havia uma opção na lista).
  useEffect(() => {
    if (unidades.length === 1) setUnidadeIds([unidades[0].id])
  }, [unidades])

  const toggleUnidade = (id) => {
    setUnidadeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleCriar = async () => {
    if (!nome.trim() || !email.trim() || !unidadeIds.length) {
      setErro('Preencha nome, e-mail e marque ao menos 1 unidade'); return
    }
    setErro('')
    setCriando(true)
    const r = await criarDedicanteUnidade(orgId, { nome, email, unidadeIds })
    setCriando(false)
    if (!r.ok) { setErro(r.error); return }
    setSenhaGerada({ nome: r.nome, email: r.email, senha: r.senha })
    setNome(''); setEmail(''); setUnidadeIds([])
    recarregar()
  }

  const handleRemover = async (membro) => {
    if (!await confirmar(`Remover o acesso de ${membro.nome || membro.email}? Ele não vai mais conseguir entrar.`)) return
    const r = await removerDedicanteUnidade(orgId, membro.id)
    if (!r.ok) { toast('Erro ao remover: ' + r.error); return }
    recarregar()
  }

  if (loading) return <div className="px-4 py-12 text-center text-stone-400 font-bold animate-pulse">Carregando…</div>

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-1.5">
        <div className="text-xs font-black text-stone-400 uppercase tracking-widest">O que um dedicante enxerga</div>
        <p className="text-sm text-stone-500">Só as unidades marcadas abaixo. Ele não vê valores de custo, não edita produto/estoque, não sobe planilha e não abre/fecha o mês.</p>
      </div>

      {lista.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-50">
          {lista.map(m => (
            <div key={m.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold text-stone-800 truncate">{m.nome || '(sem nome)'}</div>
                <div className="text-xs text-stone-400 truncate">{m.email}</div>
                <div className="text-xs text-green-700 font-semibold mt-0.5">
                  {m.unidades.length ? m.unidades.map(u => u.nome).join(', ') : 'nenhuma unidade'}
                </div>
              </div>
              <button onClick={() => handleRemover(m)}
                className="text-red-500 text-xs font-black flex-shrink-0 px-2.5 py-1.5 active:bg-red-50 rounded-lg">
                🗑️ Remover
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-3">
        <div className="text-xs font-black text-stone-400 uppercase tracking-widest">+ Cadastrar dedicante</div>
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome"
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-green-500" />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" type="email"
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-green-500" />
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-stone-500">Unidades que ele representa</div>
          {unidades.length === 0 && <div className="text-xs text-stone-400">Cadastre uma unidade primeiro, na aba Unidades.</div>}
          {unidades.map(u => {
            const marcado = unidadeIds.includes(u.id)
            return (
              <label key={u.id} className="flex items-center gap-2 text-sm font-semibold text-stone-700 cursor-pointer select-none">
                {/* checkbox nativo fica só pra semântica/teclado — some visualmente
                    (o desenho padrão do navegador não aparecia neste projeto, por
                    causa do reset de CSS global); quem mostra o estado é o span. */}
                <input type="checkbox" checked={marcado} onChange={() => toggleUnidade(u.id)} className="sr-only" />
                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${marcado ? 'bg-green-700 border-green-700' : 'bg-white border-stone-300'}`}>
                  {marcado && <span className="text-white text-xs leading-none">✓</span>}
                </span>
                {u.nome}
              </label>
            )
          })}
        </div>
        {erro && <div className="text-sm text-red-600 font-semibold">{erro}</div>}
        <button onClick={handleCriar} disabled={criando}
          className="w-full py-3 bg-green-700 text-white rounded-xl font-black text-sm active:bg-green-800 disabled:opacity-50">
          {criando ? 'Criando…' : '+ Criar acesso'}
        </button>
      </div>

      {senhaGerada && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setSenhaGerada(null)}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <div className="text-lg font-black text-green-800">✅ Acesso criado</div>
            <p className="text-sm text-stone-500">
              Copie e envie pra <strong>{senhaGerada.nome}</strong> por WhatsApp — essa senha só aparece agora, não dá pra ver de novo depois.
            </p>
            <div className="bg-stone-50 rounded-xl p-3 space-y-1">
              <div className="text-xs text-stone-400">E-mail (login)</div>
              <div className="text-sm font-bold text-stone-800 select-all break-all">{senhaGerada.email}</div>
              <div className="text-xs text-stone-400 mt-2">Senha</div>
              <div className="text-lg font-black text-green-700 select-all tracking-wide">{senhaGerada.senha}</div>
            </div>
            <button onClick={() => setSenhaGerada(null)}
              className="w-full py-3 bg-green-700 text-white rounded-xl font-black text-sm active:bg-green-800">
              Já copiei
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TabDados({ org, onSalvo }) {
  const [nome, setNome]              = useState(org?.responsavelNome || '')
  const [tipo, setTipo]              = useState(org?.documentoTipo || 'cpf')
  const [documento, setDocumento]    = useState(org?.documento || '')
  const [razaoSocial, setRazaoSocial] = useState(org?.razaoSocial || '')
  const [salvando, setSalvando]      = useState(false)

  const salvar = async () => {
    if (!nome.trim() || !documento.trim()) { toast('Preencha nome e CPF/CNPJ'); return }
    setSalvando(true)
    const r = await atualizarDadosOrganizacao(org.orgId, {
      responsavelNome: nome,
      razaoSocial: tipo === 'cnpj' ? razaoSocial : '',
      documento,
      documentoTipo: tipo,
    })
    setSalvando(false)
    if (r.ok) { toast('Dados salvos'); onSalvo?.() }
    else toast('Erro ao salvar: ' + r.error)
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-700 font-semibold">
        Esses dados não aparecem pra membros. Servem pra identificação caso o sistema passe a ter cobrança ou integração com outros serviços no futuro.
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-3">
        <div>
          <label className="block text-sm font-bold text-stone-600 mb-1">Seu nome (responsável)</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-green-500" />
        </div>

        <div>
          <label className="block text-sm font-bold text-stone-600 mb-1">Tipo de documento</label>
          <div className="flex gap-2">
            {['cpf', 'cnpj'].map(t => (
              <button key={t} onClick={() => setTipo(t)}
                className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-colors ${tipo === t ? 'bg-green-700 text-white' : 'bg-stone-100 text-stone-500'}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-stone-600 mb-1">{tipo === 'cpf' ? 'CPF' : 'CNPJ'}</label>
          <input value={documento} onChange={e => setDocumento(e.target.value)}
            placeholder={tipo === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-green-500" />
        </div>

        {tipo === 'cnpj' && (
          <div>
            <label className="block text-sm font-bold text-stone-600 mb-1">Razão social <span className="text-stone-400 font-normal">(opcional)</span></label>
            <input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} placeholder="Nome da empresa"
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-green-500" />
          </div>
        )}

        <button onClick={salvar} disabled={salvando}
          className="w-full py-3.5 bg-green-700 text-white rounded-2xl font-black text-base active:bg-green-800 disabled:opacity-50">
          {salvando ? '⟳ Salvando…' : '💾 Salvar dados'}
        </button>
      </div>
    </div>
  )
}


function ModalImportarCatalogo({ periodo, produtosAtuais, orgId, onConcluido, onClose }) {
  const [etapa, setEtapa]           = useState('upload') // upload | preview
  const [tipoArquivo, setTipoArquivo] = useState(null) // null | 'imagem' | 'planilha'
  const [arquivo, setArquivo]       = useState(null)
  const [imagem, setImagem]         = useState(null)
  const [imgBase64, setImgBase64]   = useState(null)
  const [importados, setImportados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState('')
  const [periodoTabela, setPeriodoTabela] = useState(null)
  const [mesmoMes, setMesmoMes]     = useState(true)
  const [dataLimite, setDataLimite] = useState('')
  const [confirmouConflitos, setConfirmouConflitos] = useState(false)

  const handleFile = e => {
    const file = e.target.files?.[0]
    if (!file) return
    setErro('')
    setArquivo(file)
    if (ehPlanilha(file)) {
      setTipoArquivo('planilha')
      setImagem(null); setImgBase64(null)
    } else {
      setTipoArquivo('imagem')
      setImagem(URL.createObjectURL(file))
      const reader = new FileReader()
      reader.onload = ev => setImgBase64(ev.target.result.split(',')[1])
      reader.readAsDataURL(file)
    }
  }

  // Mistura o resultado (foto ou planilha) com o que já existe no período: id
  // e caixasAbertas sempre vêm do produto já cadastrado (são configuração
  // local, nenhuma fonte externa sabe disso). precoCusto e qtdCaixa só são
  // preservados do existente quando a fonte nova não trouxe valor melhor —
  // a planilha traz custo e un./embalagem reais da Korin, então prevalecem;
  // a foto nunca traz custo, então preserva o que já estava configurado.
  //
  // O casamento com o produto existente é só pelo `cod` — se o código já
  // pertencia a um produto de NOME diferente, é sinal de que o código foi
  // reaproveitado (ex: numeração sequencial manual que desloca quando um
  // item é inserido no meio do bloco). Sinalizamos (conflitoCod) em vez de
  // sobrescrever direto, porque um pedido pendente que referencia esse
  // mesmo produto por trás dos panos passaria a exibir/cobrar o produto
  // novo sem nenhum aviso.
  const mesclarComExistentes = (produtosNovos) =>
    produtosNovos.map(p => {
      const exist = produtosAtuais.find(x => x.cod === p.cod)
      const nomeMudou = exist && normalizarTexto(exist.nomeOriginalKorin || exist.nome) !== normalizarTexto(p.nomeOriginalKorin || p.nome)
      return {
        ...p,
        id: exist?.id,
        // Nome customizado (por ela, ou ajustado numa revisão de import
        // anterior) nunca é sobrescrito por uma reimportação — só o nome
        // cru original da Korin (referência) é sempre atualizado.
        nome: exist?.nomeCustomizado ? exist.nome : p.nome,
        nomeCustomizado: exist?.nomeCustomizado || false,
        precoCusto: p.precoCusto ?? exist?.precoCusto ?? null,
        qtdCaixa: exist?.qtdCaixa ?? p.qtdCaixa ?? 0,
        caixasAbertas: exist?.caixasAbertas ?? 0,
        conflitoCod: nomeMudou,
        nomeAnterior: nomeMudou ? exist.nome : null,
      }
    })

  const processar = async () => {
    if (!arquivo) return
    setCarregando(true); setErro('')
    try {
      let periodoLido, produtosBase

      if (tipoArquivo === 'planilha') {
        const { periodo: p, produtos } = await parseTabelaKorin(arquivo)
        if (!produtos.length) { setErro('Nenhum produto reconhecido nesta planilha. Confira se é o arquivo .xlsx original da Korin.'); return }

        const catRes  = await fetch('/api/classificar-categorias', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ produtos: produtos.map(x => ({ cod: x.cod, nome: x.nome })) })
        })
        const catData = await catRes.json()
        const categorias = catData.categorias || {}
        produtosBase = produtos.map(x => ({ ...x, categoria: categorias[String(x.cod)] || CATS_ORDEM[0] }))
        periodoLido = p
      } else {
        const res  = await fetch('/api/interpretar-catalogo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagemBase64: imgBase64 })
        })
        const data = await res.json()
        if (!data.produtos?.length) { setErro(data.erro || 'Nenhum produto encontrado. Tente com uma foto mais nítida.'); return }
        produtosBase = data.produtos
        periodoLido = data.periodo
      }

      setImportados(mesclarComExistentes(produtosBase))
      setPeriodoTabela(periodoLido)
      setConfirmouConflitos(false)

      // Compara contra o período corrente DO BANCO — nunca contra o relógio do celular.
      const bate = periodoLido && periodo?.nome && normalizarTexto(periodoLido) === normalizarTexto(periodo.nome)
      setMesmoMes(Boolean(bate))
      setEtapa('preview')
    } catch {
      setErro(tipoArquivo === 'planilha' ? 'Erro ao ler a planilha. Confira se é um arquivo .xlsx válido.' : 'Erro de conexão. Tente novamente.')
    } finally { setCarregando(false) }
  }

  const conflitos = importados.filter(p => p.conflitoCod)

  const confirmarSalvar = async () => {
    if (!mesmoMes && !dataLimite) { toast('Informe a data limite do novo período'); return }
    if (conflitos.length > 0 && !confirmouConflitos) { toast('Revise e confirme os produtos com código reaproveitado antes de salvar'); return }
    setSalvando(true)
    try {
      let periodoAlvo = periodo?.id
      if (!mesmoMes) {
        const r = await criarPeriodoComCopia(orgId, periodoTabela || 'Novo período', dataLimite)
        if (!r.ok) { toast('Erro ao criar período: ' + r.error); setSalvando(false); return }
        periodoAlvo = r.periodoId
      }
      const r2 = await substituirProdutosDoPeriodo(periodoAlvo, importados)
      if (!r2.ok) { toast('Erro ao salvar produtos: ' + r2.error); setSalvando(false); return }
      const msgBase = mesmoMes ? 'Catálogo atualizado' : `Período "${periodoTabela}" criado e catálogo importado`
      const avisoPedidos = r2.mantidosPorPedido
        ? ` (${r2.mantidosPorPedido} produto${r2.mantidosPorPedido > 1 ? 's' : ''} fora da tabela mantido${r2.mantidosPorPedido > 1 ? 's' : ''} por ter pedido em aberto)`
        : ''
      toast(msgBase + avisoPedidos)
      onConcluido()
    } finally { setSalvando(false) }
  }

  if (etapa === 'upload') return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-xl font-black">Importar catálogo</div>
          <button onClick={onClose} className="p-2 rounded-full bg-stone-100 text-xl">✕</button>
        </div>
        {!arquivo ? (
          <label>
            <div className="border-2 border-dashed border-green-300 rounded-2xl p-10 text-center cursor-pointer active:bg-green-50">
              <div className="text-5xl mb-3">📷</div>
              <div className="text-base font-black text-green-700">Tirar foto ou escolher arquivo</div>
              <div className="text-sm text-stone-400 mt-1">Foto ou planilha (.xlsx) da tabela da Korin</div>
            </div>
            <input type="file" accept="image/*,.xlsx,.xls" className="hidden" onChange={handleFile} />
          </label>
        ) : tipoArquivo === 'planilha' ? (
          <div className="flex items-center gap-3 bg-stone-50 rounded-2xl p-4 border border-stone-100">
            <div className="text-3xl flex-shrink-0">📊</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-stone-800 truncate">{arquivo.name}</div>
              <button onClick={() => { setArquivo(null); setTipoArquivo(null) }} className="text-xs text-stone-400 underline mt-0.5">Trocar arquivo</button>
            </div>
          </div>
        ) : (
          <div>
            <img src={imagem} alt="Tabela" className="w-full rounded-2xl max-h-60 object-contain bg-stone-50" />
            <button onClick={() => { setArquivo(null); setTipoArquivo(null); setImagem(null); setImgBase64(null) }} className="mt-1 text-xs text-stone-400 underline">Trocar imagem</button>
          </div>
        )}
        {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-semibold">{erro}</div>}
        <button onClick={processar} disabled={!arquivo || carregando}
          className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {carregando
            ? <><span className="animate-spin inline-block">⟳</span> {tipoArquivo === 'planilha' ? 'Lendo planilha…' : 'Interpretando com IA…'}</>
            : tipoArquivo === 'planilha' ? '📊 Ler planilha' : '🤖 Interpretar com IA'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="p-4 border-b border-stone-100 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xl font-black">Pré-visualização</div>
              <div className="text-sm text-stone-400">
                {importados.length} produtos encontrados
                {periodoTabela && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${mesmoMes ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {periodoTabela}
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-400 mt-1">✏️ Já simplificamos os nomes da Korin — toca em qualquer um pra ajustar. Nome ajustado não é mais sobrescrito nas próximas importações.</div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-stone-100 text-xl">✕</button>
          </div>
        </div>

        {!mesmoMes && (
          <div className="px-4 pt-3 flex-shrink-0">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-700 font-semibold space-y-2">
              <div>
                {periodo
                  ? <>⚠️ Tabela de um mês diferente do período corrente (<strong>{periodo.nome}</strong>). Salvar vai <strong>criar um período novo</strong> ({periodoTabela}) e torná-lo o corrente — o mês atual fica arquivado intacto.</>
                  : <>📥 Este será o <strong>primeiro período</strong> ({periodoTabela}) do catálogo.</>}
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Data limite para pedidos *</label>
                <input type="date" value={dataLimite} onChange={e => setDataLimite(e.target.value)}
                  className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-400" />
              </div>
            </div>
          </div>
        )}

        {conflitos.length > 0 && (
          <div className="px-4 pt-3 flex-shrink-0">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 space-y-2">
              <div className="font-bold">
                ⚠️ {conflitos.length} código{conflitos.length > 1 ? 's' : ''} da tabela nova já {conflitos.length > 1 ? 'eram' : 'era'} de outro produto
              </div>
              <div className="space-y-1">
                {conflitos.map(c => (
                  <div key={c.cod} className="text-xs">
                    <span className="font-bold bg-white px-1 rounded">{c.cod}</span>{' '}
                    era "<span className="font-semibold">{c.nomeAnterior}</span>", agora é "<span className="font-semibold">{c.nome}</span>"
                  </div>
                ))}
              </div>
              <div className="text-xs">
                Se o código foi reaproveitado por engano (ex: um item inserido no meio da tabela deslocou a numeração), corrija a tabela de origem antes de importar de novo. Se está correto, confirme abaixo pra continuar.
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input type="checkbox" checked={confirmouConflitos} onChange={e => setConfirmouConflitos(e.target.checked)}
                  className="w-4 h-4 accent-amber-600" />
                <span className="text-xs font-bold">Revisei e confirmo que esses códigos mudaram de produto mesmo</span>
              </label>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {importados.map((p, i) => (
            <div key={p.cod} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${p.conflitoCod ? 'bg-amber-50 border border-amber-200' : 'bg-stone-50'}`}>
              <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center text-xs font-black flex-shrink-0 ${p.conflitoCod ? 'bg-amber-600' : 'bg-green-700'}`}>{p.cod}</div>
              <div className="flex-1 min-w-0">
                <input value={p.nome}
                  onChange={e => { const v = e.target.value; setImportados(prev => prev.map((x, j) => j === i ? { ...x, nome: v, nomeCustomizado: true } : x)) }}
                  className="text-sm font-bold text-stone-800 bg-transparent border-b border-transparent focus:border-green-500 focus:outline-none w-full truncate" />
                {p.nomeOriginalKorin && normalizarTexto(p.nomeOriginalKorin) !== normalizarTexto(p.nome) && (
                  <div className="text-[11px] text-stone-400 truncate">Korin: {p.nomeOriginalKorin}</div>
                )}
                {p.conflitoCod && (
                  <div className="text-xs text-amber-700 font-semibold truncate">⚠️ código {p.cod} era "{p.nomeAnterior}"</div>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  {p.unidade && <span className="text-xs text-stone-400">{p.unidade}</span>}
                  <select value={p.categoria}
                    onChange={e => { const cat = e.target.value; setImportados(prev => prev.map((x, j) => j === i ? { ...x, categoria: cat } : x)) }}
                    className="text-xs font-bold bg-white border border-stone-200 rounded-lg pl-1.5 pr-5 py-0.5 focus:outline-none focus:border-green-500"
                    style={{ color: CAT_COR[p.categoria] || '#555' }}>
                    {CATS_ORDEM.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-sm font-black text-green-700 flex-shrink-0">{fmt(p.preco)}</div>
              <button onClick={() => setImportados(prev => prev.filter((_,j) => j !== i))}
                className="text-stone-300 text-lg active:text-red-500 flex-shrink-0">✕</button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-stone-100 flex gap-3 flex-shrink-0">
          <button onClick={() => setEtapa('upload')}
            className="px-5 py-3.5 bg-stone-100 text-stone-600 rounded-2xl font-black active:bg-stone-200">← Voltar</button>
          <button onClick={confirmarSalvar} disabled={salvando || (!mesmoMes && !dataLimite) || (conflitos.length > 0 && !confirmouConflitos)}
            className="flex-1 py-3.5 bg-green-700 text-white rounded-2xl font-black text-base active:bg-green-800 disabled:opacity-50">
            {salvando ? '⟳ Salvando…' : `✅ Salvar ${importados.length} produtos`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SUB-ABA: RELATÓRIOS ───────────────────────────────────────────────────
// Hub central de tudo que se imprime/exporta (Config → 🖨️ Relatórios).
// Filtro de unidade vale pra Pedidos e Fechamento; Estoque é sempre da
// organização inteira (não existe mais estoque por unidade — ver
// calcEstoque em lib/helpers.js). Filtro de período é o seletor de período
// já existente no topo da aba Config (produtos/pedidos aqui já vêm
// escopados pra ele).
function TabRelatorios({ produtos, pedidos, periodo, unidades, org, sobraAnterior = {}, comprasConfirmadas = [] }) {
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')

  const pedidosFiltrados = pedidos.filter(p => filtroUnidade === 'Todas' || (p.unidade || 'Não informada') === filtroUnidade)
  const unidadeLabel = filtroUnidade === 'Todas' ? null : filtroUnidade

  // ── Relatório de Estoque ─────────────────────────────────────────────
  const totaisTodos = getTotaisPorProduto(pedidos)
  const totaisEntregues = getEntreguesPorProduto(pedidos)
  const confirmadoPorProdutoId = {}
  comprasConfirmadas.forEach(c => { confirmadoPorProdutoId[c.periodoProdutoId] = (confirmadoPorProdutoId[c.periodoProdutoId] || 0) + c.quantidadeUnd })

  const gerarEstoque = () => {
    const linhas = produtos.map(p => {
      const totalPedido = totaisTodos[p.id] || 0
      const sobra = sobraAnterior[p.cod] || 0
      const confirmado = confirmadoPorProdutoId[p.id] ?? null
      const { restante } = calcEstoque(p, totalPedido, sobra, confirmado, totaisEntregues[p.id] || 0)
      return { cod: p.cod, nome: p.nome, unidade: p.unidade, saldo: restante }
    })
    printRelatorioEstoque(linhas, periodo, org?.nome)
  }

  // ── Relatório de Fechamento (resumo financeiro) ─────────────────────
  const gerarFechamento = () => {
    const getV = p => calcTotal(p, produtos)
    const getCusto = p => p.itens.reduce((s, it) => { const pr = produtos.find(x => x.id === it.produtoId); return s + (pr?.precoCusto || 0) * it.qty }, 0)
    const entregues    = pedidosFiltrados.filter(p => p.status === 'entregue')
    const pendentes    = pedidosFiltrados.filter(p => p.status === 'pendente')
    const valorVenda   = pedidosFiltrados.reduce((s, p) => s + getV(p), 0)
    const valorCustoN  = pedidosFiltrados.reduce((s, p) => s + getCusto(p), 0)
    const temCusto     = valorCustoN > 0
    const qtdeItens    = pedidosFiltrados.reduce((s, p) => s + p.itens.reduce((a, i) => a + i.qty, 0), 0)
    const margem       = temCusto && valorVenda > 0 ? (((valorVenda - valorCustoN) / valorVenda) * 100).toFixed(1) : null
    printRelatorioFechamento({
      valorVenda: valorVenda.toFixed(2).replace('.', ','),
      valorCusto: temCusto ? valorCustoN.toFixed(2).replace('.', ',') : null,
      qtdePedidosEntregues: entregues.length,
      valorVendaEntregues: entregues.reduce((s, p) => s + getV(p), 0).toFixed(2).replace('.', ','),
      qtdePedidosPendentes: pendentes.length,
      valorVendaPendentes: pendentes.reduce((s, p) => s + getV(p), 0).toFixed(2).replace('.', ','),
      qtdePedidos: pedidosFiltrados.length,
      qtdeItens,
      margem,
    }, periodo, unidadeLabel, org?.nome)
  }

  const qtdPendentes = pedidosFiltrados.filter(p => p.status === 'pendente').length
  const qtdEntregues = pedidosFiltrados.filter(p => p.status === 'entregue').length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
        <label className="block text-xs font-bold text-stone-500 mb-1.5">Filtrar por unidade</label>
        <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-green-500 bg-white">
          <option value="Todas">Todas as unidades</option>
          {unidades.map(u => <option key={u}>{u}</option>)}
        </select>
        <div className="text-xs text-stone-400 mt-1.5">Vale pros relatórios de Pedidos e de Fechamento. Estoque é sempre da organização inteira.</div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-2">
        <div className="text-sm font-black text-stone-700">📋 Pedidos Pendentes</div>
        <div className="text-xs text-stone-400">{qtdPendentes} pedido{qtdPendentes !== 1 ? 's' : ''} nesse filtro</div>
        <button onClick={() => printRelatorioPedidos(pedidosFiltrados, produtos, periodo, 'pendente', unidadeLabel, org?.nome)}
          className="w-full py-3 bg-stone-800 text-white rounded-xl font-black text-sm active:bg-stone-900">
          🖨️ Gerar relatório
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-2">
        <div className="text-sm font-black text-stone-700">✅ Pedidos Entregues</div>
        <div className="text-xs text-stone-400">{qtdEntregues} pedido{qtdEntregues !== 1 ? 's' : ''} nesse filtro</div>
        <button onClick={() => printRelatorioPedidos(pedidosFiltrados, produtos, periodo, 'entregue', unidadeLabel, org?.nome)}
          className="w-full py-3 bg-stone-800 text-white rounded-xl font-black text-sm active:bg-stone-900">
          🖨️ Gerar relatório
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-2">
        <div className="text-sm font-black text-stone-700">📦 Estoque</div>
        <div className="text-xs text-stone-400">Produto × saldo atual — organização inteira, sem filtro de unidade</div>
        <button onClick={gerarEstoque}
          className="w-full py-3 bg-stone-800 text-white rounded-xl font-black text-sm active:bg-stone-900">
          🖨️ Gerar relatório
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-2">
        <div className="text-sm font-black text-stone-700">💰 Fechamento</div>
        <div className="text-xs text-stone-400">Venda, custo, margem e quantidades desse filtro</div>
        <button onClick={gerarFechamento}
          className="w-full py-3 bg-stone-800 text-white rounded-xl font-black text-sm active:bg-stone-900">
          🖨️ Gerar relatório
        </button>
      </div>

      <PlanilhaKorinCard produtos={produtos} pedidos={pedidos} periodo={periodo} unidades={unidades} />
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function WebScreen({ produtos: produtosCorrente, periodo: periodoCorrente, org, onUnidadesChange, onRecarregar, abrirEm, onAbrirEmConsumido, onOrgRefresh }) {
  const orgId = org?.orgId
  const orgSlug = org?.slug
  const [subTab, setSubTab]               = useState(abrirEm || 'controles')
  // Reage a abrirEm tanto no mount quanto em mudanças posteriores (ex: usuário já
  // está na aba Config e clica em "Completar cadastro" de novo) — antes só lia o
  // valor inicial e nunca mais reagia, então o botão não fazia nada se a tela
  // já estivesse montada.
  useEffect(() => { if (abrirEm) { setSubTab(abrirEm); onAbrirEmConsumido?.() } }, [abrirEm])
  const [dataLimiteEdit, setDataLimiteEdit] = useState(periodoCorrente?.data_limite ?? null) // pendente até salvar
  const [periodoWeb, setPeriodoWeb]       = useState(periodoCorrente?.id || null) // período sendo visualizado
  const [periodosLista, setPeriodosLista] = useState([])
  const [produtosWeb, setProdutosWeb]     = useState(produtosCorrente)  // produtos do período visualizado
  const visualizandoCorrente = periodoWeb === periodoCorrente?.id

  // Ressincroniza produtosWeb quando o CONJUNTO de produtos do período corrente muda
  // (ex: importação de catálogo adiciona/remove produtos) — sem disparar em edições
  // de valor (qtdCaixa/caixasAbertas) que só mudam o conteúdo, não a composição, pra
  // não sobrescrever uma edição em andamento durante o auto-refresh de 60s.
  const prevCodsRef = useRef(null)
  useEffect(() => {
    if (!visualizandoCorrente) return
    const cods = produtosCorrente.map(p => p.cod).sort().join(',')
    if (prevCodsRef.current !== null && prevCodsRef.current !== cods) setProdutosWeb(produtosCorrente)
    prevCodsRef.current = cods
  }, [produtosCorrente, visualizandoCorrente])
  const [pedidos, setPedidos]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [salvando, setSalvando]           = useState(false)
  const [modalImportar, setModalImportar] = useState(false)
  const [unidades, setUnidades] = useState([])
  const recarregarUnidades = useCallback(() => { if (orgId) getUnidades(orgId).then(setUnidades) }, [orgId])
  useEffect(() => { recarregarUnidades() }, [recarregarUnidades])
  const nomesUnidades = unidades.map(u => u.nome)

  // Sobra do período arquivado anterior — só faz sentido pro período CORRENTE
  // (é o que ainda vai receber compra nova; período arquivado é histórico
  // fechado, não tem sentido mostrar "considere isso" nele).
  const [sobraAnterior, setSobraAnterior] = useState({})
  useEffect(() => {
    if (!orgId || !periodoCorrente?.id) return
    getSobraPeriodoAnterior(orgId, periodoCorrente.id).then(setSobraAnterior)
  }, [orgId, periodoCorrente?.id])

  // Histórico de compras confirmadas do período sendo visualizado — recarrega
  // sozinho quando muda de período, e sob demanda depois de adicionar/excluir
  // uma linha (ver recarregarComprasConfirmadas passado pro modal).
  const [comprasConfirmadas, setComprasConfirmadas] = useState([])
  const recarregarComprasConfirmadas = useCallback(() => {
    if (periodoWeb) getComprasConfirmadas(periodoWeb).then(setComprasConfirmadas)
  }, [periodoWeb])
  useEffect(() => { recarregarComprasConfirmadas() }, [recarregarComprasConfirmadas])

  // Só ressincroniza quando o PERÍODO muda (id diferente) — nunca durante um
  // refresh automático do mesmo período, senão apaga edição em andamento.
  useEffect(() => { setDataLimiteEdit(periodoCorrente?.data_limite ?? null) }, [periodoCorrente?.id])
  useEffect(() => { setPeriodoWeb(periodoCorrente?.id || null) }, [periodoCorrente?.id])

  useEffect(() => {
    if (!orgId) return
    const init = async () => {
      setLoading(true)
      const lista = await listarPeriodos(orgId)
      setPeriodosLista(lista)
      if (periodoCorrente) {
        const peds = await getPedidos(periodoCorrente.id)
        setPedidos(peds)
      }
      setProdutosWeb(produtosCorrente)
      setLoading(false)
    }
    init()
  }, [orgId])

  // Troca de período visualizado → recarrega produtos+pedidos daquele período
  useEffect(() => {
    if (!periodoWeb || !periodoCorrente) return
    const carregar = async () => {
      const ehCorrente = periodoWeb === periodoCorrente.id
      const [peds, prods] = await Promise.all([
        getPedidos(periodoWeb),
        ehCorrente ? Promise.resolve(produtosCorrente) : getProdutosDoPeriodo(periodoWeb),
      ])
      setPedidos(peds)
      setProdutosWeb(prods)
    }
    carregar()
  }, [periodoWeb])

  const periodoSelecionado = periodosLista.find(p => p.id === periodoWeb)
  const somenteLeitura = !visualizandoCorrente && periodoSelecionado?.status === 'arquivado'

  const handleSaveControles = async () => {
    setSalvando(true)
    // Reseta o aviso de fechamento automático -- ela mudou a data, o cron
    // deve poder avisar de novo quando essa NOVA data vencer.
    const r = await atualizarPeriodo(periodoCorrente.id, { data_limite: dataLimiteEdit, push_fechamento_enviado: false })
    setSalvando(false)
    if (r.ok) { toast('Configurações salvas'); onRecarregar?.() }
    else toast('Erro ao salvar: ' + r.error)
  }

  // Notifica quem ativou aviso no catálogo público -- nunca trava o toggle
  // se isso falhar (rede, push desativado etc.), é só um efeito colateral.
  const notificarMembros = async (tipo) => {
    try {
      await fetch('/api/membros', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'notificar', orgId, tipo, periodoNome: periodoCorrente?.nome, slug: orgSlug }),
      })
    } catch {}
  }

  const handleToggleAberto = async () => {
    const abrindo = !periodoCorrente.catalogo_aberto
    const r = await atualizarPeriodo(periodoCorrente.id, {
      catalogo_aberto: abrindo,
      ...(abrindo ? { push_fechamento_enviado: false } : {}),
    })
    if (r.ok) { onRecarregar?.(); notificarMembros(abrindo ? 'abriu' : 'fechou') }
    else toast('Erro ao atualizar: ' + r.error)
  }

  const handleSaveProdutos = async () => {
    if (somenteLeitura) return
    setSalvando(true)
    const alvo = periodoWeb || periodoCorrente?.id
    const results = await Promise.all(produtosWeb.map(p => salvarProdutoNoPeriodo(alvo, p)))
    setSalvando(false)
    const falhou = results.find(r => !r.ok)
    if (falhou) { toast('Erro ao salvar: ' + falhou.error); return }
    toast('Configuração de produtos salva')
    if (alvo === periodoCorrente?.id) onRecarregar?.()
  }

  if (loading) return (
    <div className="px-4 py-12 text-center text-stone-400 font-bold animate-pulse">Carregando…</div>
  )

  if (!periodoCorrente) return (
    <div className="px-4 py-12 text-center text-stone-400 space-y-4">
      <div className="text-4xl">📥</div>
      <div className="font-bold text-stone-600">Nenhum período configurado ainda</div>
      <p className="text-sm">Importe a primeira tabela de preços da Korin pra começar.</p>
      <button onClick={() => setModalImportar(true)}
        className="w-full py-3.5 bg-green-700 text-white rounded-2xl font-black text-base active:bg-green-800">
        📥 Importar primeiro catálogo
      </button>
      {modalImportar && (
        <ModalImportarCatalogo
          periodo={null}
          produtosAtuais={[]}
          orgId={orgId}
          onConcluido={() => { setModalImportar(false); onRecarregar?.() }}
          onClose={() => setModalImportar(false)}
        />
      )}
    </div>
  )

  const TABS = [
    { id: 'controles', label: '⚙️ Config' },
    { id: 'produtos',  label: '📦 Estoque' },
    { id: 'relatorios', label: '🖨️ Relatórios' },
    { id: 'unidades',  label: '📍 Unidades' },
    { id: 'clientes',  label: '👥 Clientes' },
    ...(org?.permiteDedicanteUnidade ? [{ id: 'dedicantes', label: '🧑‍💼 Dedicantes' }] : []),
    { id: 'dados',     label: org?.cadastroCompleto ? '🏢 Dados' : '🏢 Dados ⚠️' },
    { id: 'financeiro', label: '💳 Financeiro' },
  ]

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Seletor de período Web */}
      {periodosLista.length > 1 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 min-w-max pb-1">
            {periodosLista.map(p => (
              <button key={p.id} onClick={() => setPeriodoWeb(p.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${periodoWeb === p.id ? 'bg-green-700 text-white' : 'bg-white text-stone-500 border border-stone-200 active:bg-stone-50'}`}>
                {p.nome}{p.id === periodoCorrente.id ? ' ●' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${subTab === t.id ? 'bg-green-700 text-white' : 'bg-white text-stone-500 border border-stone-200 active:bg-stone-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      {subTab === 'controles' && visualizandoCorrente && (
        <TabControles
          periodo={periodoCorrente}
          dataLimite={dataLimiteEdit}
          onChangeDataLimite={setDataLimiteEdit}
          onToggleAberto={handleToggleAberto}
          onSave={handleSaveControles}
          onImportar={() => setModalImportar(true)}
          salvando={salvando}
          orgId={orgId} orgSlug={orgSlug}
        />
      )}
      {subTab === 'controles' && !visualizandoCorrente && (
        <div className="text-center py-12 text-stone-400">
          <div className="text-4xl mb-3">📜</div>
          <div className="font-bold">Config só se aplica ao período corrente</div>
          <div className="text-sm mt-1">Selecione "{periodoCorrente.nome} ●" acima pra editar.</div>
        </div>
      )}
      {subTab === 'produtos' && (
        <TabProdutos produtos={produtosWeb} pedidos={pedidos} onChange={setProdutosWeb} onSave={handleSaveProdutos} salvando={salvando} somenteLeitura={somenteLeitura}
          sobraAnterior={visualizandoCorrente ? sobraAnterior : {}}
          comprasConfirmadas={comprasConfirmadas} onComprasChange={recarregarComprasConfirmadas} />
      )}
      {subTab === 'relatorios' && (
        <TabRelatorios produtos={produtosWeb} pedidos={pedidos} periodo={periodoSelecionado?.nome || periodoCorrente.nome} unidades={nomesUnidades} org={org}
          sobraAnterior={visualizandoCorrente ? sobraAnterior : {}}
          comprasConfirmadas={comprasConfirmadas} />
      )}
      {subTab === 'unidades' && (
        <UnidadesManager orgId={orgId} orgSlug={orgSlug} modo="settings" onChange={lista => { setUnidades(lista); onUnidadesChange?.(lista) }} />
      )}
      {subTab === 'clientes' && (
        <ClientesManager orgId={orgId} unidadesNomes={nomesUnidades} />
      )}
      {subTab === 'dedicantes' && org?.permiteDedicanteUnidade && (
        <TabDedicantes orgId={orgId} unidades={unidades} />
      )}
      {subTab === 'dados' && (
        <TabDados org={org} onSalvo={() => onOrgRefresh?.()} />
      )}
      {subTab === 'financeiro' && (
        <TabFinanceiro org={org} unidadesCount={unidades.length} onIrParaDados={() => setSubTab('dados')} onSalvo={() => onOrgRefresh?.()} />
      )}

      {modalImportar && (
        <ModalImportarCatalogo
          periodo={periodoCorrente}
          produtosAtuais={produtosCorrente}
          orgId={orgId}
          onConcluido={() => { setModalImportar(false); onRecarregar?.() }}
          onClose={() => setModalImportar(false)}
        />
      )}
    </div>
  )
}
