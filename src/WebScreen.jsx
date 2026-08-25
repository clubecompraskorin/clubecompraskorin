import { useState, useEffect, useCallback, useRef } from 'react'
import { getPedidos, getTotaisPorProduto } from './lib/store'
import { calcEstoque } from './lib/helpers'
import { atualizarDadosOrganizacao } from './lib/auth'
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
import UnidadesManager from './UnidadesManager'
import ClientesManager from './ClientesManager'

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
// qtdCaixa/caixasAbertas agora são colunas do próprio produto no período —
// não mais um mapa solto. Edição é local (lista em memória) até "Salvar".
// O "disponível" some dessa estimativa (caixasAbertas × qtdCaixa) só até a
// compra ser confirmada em Fechamento — depois disso, calcEstoque() usa o
// número real confirmado. Ver lib/helpers.js.
function TabProdutos({ produtos, pedidos, onChange, onSave, salvando, somenteLeitura, sobraAnterior = {}, comprasConfirmadas = [], onComprasChange }) {
  const totais = getTotaisPorProduto(pedidos)
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

  const addCaixa = (cod) => {
    onChange(produtos.map(p => p.cod === cod ? { ...p, caixasAbertas: (p.caixasAbertas || 0) + 1 } : p))
  }

  const cats = [...new Set([...CATS_ORDEM, ...produtos.map(p => p.categoria)])]

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-700 font-semibold">
        Configure quantas unidades vêm em cada embalagem fechada da Korin e quantas caixas estão disponíveis por
        produto. Esse número vale como estimativa até você confirmar a compra real em Fechamento —
        depois disso, o estoque passa a valer pelo que foi realmente comprado.
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
                const caixasAbertas = prod.caixasAbertas || 0
                const totalPedido = totais[prod.id] || 0
                const sobra = sobraAnterior[prod.cod] || 0
                const confirmado = confirmadoPorProdutoId[prod.id] ?? null
                const entradas = entradasPorProdutoId[prod.id] || []
                // Não trava em 0 — negativo é sinal visual de "vendeu além do estimado",
                // decisão de quem tá gerenciando, o sistema só avisa.
                const { disponivel: disponivelReal, restante } = calcEstoque(prod, totalPedido, sobra, confirmado)

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

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Un./embalagem</label>
                        <input
                          type="number" min="0" value={qtdCaixa || ''}
                          disabled={somenteLeitura}
                          onChange={e => setProdCfg(prod.cod, 'qtdCaixa', e.target.value)}
                          placeholder="0 = sem limite"
                          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-base font-bold focus:outline-none focus:border-green-500 disabled:opacity-50"
                        />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <label className="block text-xs font-bold text-stone-500 mb-1">Caixas abertas</label>
                        <div className="flex gap-1 min-w-0">
                          <input
                            type="number" min="0" value={caixasAbertas || ''}
                            disabled={somenteLeitura}
                            onChange={e => setProdCfg(prod.cod, 'caixasAbertas', e.target.value)}
                            className="w-0 flex-1 min-w-0 border border-stone-200 rounded-xl px-3 py-2.5 text-base font-bold focus:outline-none focus:border-green-500 disabled:opacity-50"
                          />
                          <button onClick={() => addCaixa(prod.cod)} disabled={somenteLeitura}
                            className="px-2 py-2.5 bg-green-600 text-white rounded-xl font-black text-sm active:bg-green-700 flex-shrink-0 disabled:opacity-50">
                            +1
                          </button>
                        </div>
                      </div>
                    </div>

                    {disponivelReal != null && (
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-stone-600">
                          📦 {disponivelReal} un. disponíveis
                          {confirmado != null && <span className="text-green-700"> · compra confirmada</span>}
                        </div>
                        {sobra > 0 && (
                          <div className="text-xs text-teal-700 font-bold">
                            Inclui {sobra} un. de sobra do período anterior
                          </div>
                        )}
                        <div className="text-xs text-stone-400">
                          {totalPedido} pedidos
                        </div>
                        <div className={`text-xs font-bold ${restante < 0 ? 'text-red-600' : restante === 0 ? 'text-amber-600' : 'text-stone-500'}`}>
                          Restante: {restante}{restante < 0 && ' — vendendo além do estimado'}
                        </div>
                      </div>
                    )}
                    {qtdCaixa > 0 && (
                      <button onClick={() => setModalHistoricoProd(prod)}
                        className="text-xs text-stone-400 font-bold underline mt-2">
                        📋 Histórico de compras{entradas.length > 0 ? ` (${entradas.length})` : ''}
                      </button>
                    )}
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
// compõe o "disponível" (planilha ou ajuste manual), remove uma errada, ou
// registra uma compra extra sem precisar gerar planilha — cada adição SOMA
// ao estoque, nunca substitui (ver registrarAjusteManualEstoque em
// lib/periodos.js). O total em si não é editável direto, só as entradas.
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
    if (!await confirmar('Remover essa compra confirmada do histórico?')) return
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
            <div className="text-center py-8 text-stone-400 text-sm">Nenhuma compra confirmada ainda pra esse produto.</div>
          ) : (
            <>
              <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-bold text-green-700">Total confirmado</span>
                <span className="text-xl font-black text-green-700">{total} un.</span>
              </div>
              {entradas.map(e => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-stone-50">
                  <div className="text-lg flex-shrink-0">{e.origem === 'planilha' ? '📊' : '✍️'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-stone-800">{e.quantidadeUnd} un.</div>
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
            <div className="text-xs font-black text-stone-500 uppercase tracking-widest">Registrar compra extra</div>
            <div className="flex gap-2">
              <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)}
                placeholder="Quantidade (un.)"
                className="w-32 border border-stone-200 rounded-xl px-3 py-2.5 text-base font-bold focus:outline-none focus:border-green-500" />
              <input value={observacao} onChange={e => setObservacao(e.target.value)}
                placeholder="Observação (opcional)"
                className="flex-1 min-w-0 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
            </div>
            {erro && <div className="text-xs text-red-600 font-semibold">{erro}</div>}
            <button onClick={adicionar} disabled={salvando || !quantidade}
              className="w-full py-3 bg-green-700 text-white rounded-2xl font-black text-sm active:bg-green-800 disabled:opacity-50">
              {salvando ? '⟳ Salvando…' : '+ Adicionar ao estoque'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SUB-ABA: DADOS CADASTRAIS ────────────────────────────────────────────────
// Não bloqueia nada — só guarda quem é o responsável e o documento, pra
// eventual cobrança ou integração futura. Pode ficar incompleto indefinidamente.
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
      const nomeMudou = exist && normalizarTexto(exist.nome) !== normalizarTexto(p.nome)
      return {
        ...p,
        id: exist?.id,
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
                <div className="text-sm font-bold text-stone-800 truncate">{p.nome}</div>
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
    const r = await atualizarPeriodo(periodoCorrente.id, { data_limite: dataLimiteEdit })
    setSalvando(false)
    if (r.ok) { toast('Configurações salvas'); onRecarregar?.() }
    else toast('Erro ao salvar: ' + r.error)
  }

  const handleToggleAberto = async () => {
    const r = await atualizarPeriodo(periodoCorrente.id, { catalogo_aberto: !periodoCorrente.catalogo_aberto })
    if (r.ok) onRecarregar?.()
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
    { id: 'unidades',  label: '📍 Unidades' },
    { id: 'clientes',  label: '👥 Clientes' },
    { id: 'dados',     label: org?.cadastroCompleto ? '🏢 Dados' : '🏢 Dados ⚠️' },
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
      {subTab === 'unidades' && (
        <UnidadesManager orgId={orgId} orgSlug={orgSlug} modo="settings" onChange={lista => { setUnidades(lista); onUnidadesChange?.(lista) }} />
      )}
      {subTab === 'clientes' && (
        <ClientesManager orgId={orgId} unidadesNomes={nomesUnidades} />
      )}
      {subTab === 'dados' && (
        <TabDados org={org} onSalvo={() => onOrgRefresh?.()} />
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
