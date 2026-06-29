import { useState, useEffect, useCallback, useRef } from 'react'
import { getPedidos, cancelarPedido, getTotaisPorProduto } from './lib/store'
import { calcTotal } from './lib/helpers'
import { atualizarDadosOrganizacao } from './lib/auth'
import {
  listarPeriodos, atualizarPeriodo, criarPeriodoComCopia,
  getProdutosDoPeriodo, salvarProdutoNoPeriodo, substituirProdutosDoPeriodo,
} from './lib/periodos'
import { getPwaInstallCount } from './lib/pwa'
import { pushSuportado, pushJaInscrito, ativarPush, desativarPush } from './lib/push'
import { CAT_COR, CATS_ORDEM } from './lib/catalog'
import { toast, confirmar } from './lib/dialog'
import { getUnidades } from './lib/unidades'
import UnidadesManager from './UnidadesManager'

const fmt = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',')
const fmtData = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : ''
// Esta aba só monitora pedido vindo do catálogo — pedido manual fica nas
// abas Pedidos/Entregas do app principal.
const getPedidosCatalogo = async (periodoId) => (await getPedidos(periodoId)).filter(p => p.origem === 'catalogo')
const normalizarTexto = s => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

function FiltroUnidade({ value, onChange, unidades = [] }) {
  const opcoes = ['Todas', ...unidades]
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 min-w-max pb-1">
        {opcoes.map(u => (
          <button key={u} onClick={() => onChange(u)}
            className={`px-3 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${value === u ? 'bg-green-700 text-white' : 'bg-white text-stone-500 border border-stone-200 active:bg-stone-50'}`}>
            {u}
          </button>
        ))}
      </div>
    </div>
  )
}

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
      <button onClick={onImportar}
        className="w-full py-3.5 bg-green-50 border-2 border-green-200 text-green-800 rounded-2xl font-black text-base active:bg-green-100 flex items-center justify-center gap-2">
        📥 Importar catálogo da Korin
      </button>

      {/* Período */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-3">
        <div className="text-xs font-black text-stone-400 uppercase tracking-widest">Configurações</div>

        <div>
          <label className="block text-sm font-bold text-stone-600 mb-1">Nome do período</label>
          <div className="w-full border border-stone-200 bg-stone-50 rounded-xl px-4 py-3 text-base font-semibold text-stone-500">
            {periodo.nome}
          </div>
          <p className="text-xs text-stone-400 mt-1.5">Pra virar o mês, importe a nova tabela de preços aqui (📥 acima) — o sistema identifica pela foto se é mês novo e cria o período automaticamente, sem perder o histórico.</p>
        </div>

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

      {/* Link */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
        <div className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3">Link para clientes</div>
        <div className="bg-stone-50 rounded-xl px-3 py-2.5 text-sm font-mono text-stone-600 mb-3 break-all">
          {linkCatalogo}
        </div>
        <button
          onClick={() => navigator.clipboard?.writeText(linkCatalogo).then(() => toast('Link copiado!'))}
          className="w-full py-3 bg-stone-100 text-stone-700 rounded-xl font-bold text-base active:bg-stone-200">
          📋 Copiar link
        </button>
        {instalacoes !== null && (
          <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-3">
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
  )
}

// ── SUB-ABA: PRODUTOS / EMBALAGENS ───────────────────────────────────────────
// qtdCaixa/caixasAbertas agora são colunas do próprio produto no período —
// não mais um mapa solto. Edição é local (lista em memória) até "Salvar".
function TabProdutos({ produtos, pedidosWeb, onChange, onSave, salvando, somenteLeitura }) {
  const totais = getTotaisPorProduto(pedidosWeb)

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
        Configure quantas unidades vêm em cada embalagem fechada da Korin e quantas caixas estão disponíveis por produto.
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
                const disponivel = qtdCaixa ? caixasAbertas * qtdCaixa : null

                return (
                  <div key={prod.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-3">
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

                    {qtdCaixa > 0 && (
                      <div className="text-xs text-stone-400 font-semibold">
                        Disponível: {disponivel} un. · Pedidos: {totalPedido} · Restante: {Math.max(0, disponivel - totalPedido)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {!somenteLeitura && (
        <button onClick={onSave} disabled={salvando}
          className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 disabled:opacity-50">
          {salvando ? '⟳ Salvando…' : '💾 Salvar configuração de produtos'}
        </button>
      )}
    </div>
  )
}

// ── SUB-ABA: PEDIDOS ──────────────────────────────────────────────────────────
function TabPedidos({ pedidosWeb, produtos, onCancelar, loading, filtroUnidade, somenteLeitura }) {
  const base = filtroUnidade && filtroUnidade !== 'Todas'
    ? pedidosWeb.filter(p => p.unidade === filtroUnidade)
    : pedidosWeb
  const ativos = base.filter(p => p.status !== 'cancelado')
  const cancelados = base.filter(p => p.status === 'cancelado')
  const totalGeral = ativos.reduce((s, p) => s + calcTotal(p, produtos), 0)

  if (loading) return (
    <div className="text-center py-12 text-stone-400 font-bold animate-pulse">Carregando pedidos…</div>
  )

  if (ativos.length === 0 && cancelados.length === 0) return (
    <div className="text-center py-12 text-stone-400">
      <div className="text-4xl mb-3">📭</div>
      <div className="font-bold">Nenhum pedido recebido ainda</div>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Resumo */}
      {ativos.length > 0 && (
        <div className="bg-green-800 text-white rounded-2xl p-4 flex justify-between items-center">
          <div>
            <div className="text-sm text-green-300 font-bold">{ativos.length} pedido{ativos.length !== 1 ? 's' : ''}</div>
            <div className="text-3xl font-black">{fmt(totalGeral)}</div>
          </div>
          <div className="text-4xl">📋</div>
        </div>
      )}

      {/* Lista */}
      {ativos.map(pedido => {
        const itensComProduto = pedido.itens
          .map(it => { const p = produtos.find(x => x.id === it.produtoId); return p ? { ...it, cod: p.cod, nome: p.nome, preco: p.preco } : null })
          .filter(Boolean)
          .sort((a, b) => a.cod - b.cod)
        return (
        <div key={pedido.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3">
            <div className="flex justify-between items-start mb-1">
              <div className="text-xl font-black text-stone-800">{pedido.clienteNome}</div>
              <div className="text-lg font-black text-green-700 ml-2">{fmt(calcTotal(pedido, produtos))}</div>
            </div>
            <div className="text-sm text-stone-500">
              📍 {pedido.unidade} · 💳 {pedido.pagamento}
            </div>
            {pedido.clienteTel && (
              <div className="text-sm text-stone-400">📱 {pedido.clienteTel}</div>
            )}
            <div className="text-xs text-stone-300 mt-0.5">
              {new Date(pedido.dataPedido).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className="px-4 pb-3">
            {itensComProduto.map(it => (
              <div key={it.cod} className="flex justify-between text-sm py-0.5">
                <span className="text-stone-800 font-semibold">
                  <span className="text-xs bg-stone-100 px-1 rounded font-bold mr-1">{it.cod}</span>
                  {it.qty}× {it.nome}
                </span>
                <span className="text-stone-700 font-bold">{fmt(it.preco * it.qty)}</span>
              </div>
            ))}
          </div>
          {!somenteLeitura && (
            <div className="border-t border-stone-50 px-4 py-2">
              <button onClick={() => onCancelar(pedido.id)}
                className="text-xs text-red-400 font-bold active:text-red-600">
                Cancelar pedido
              </button>
            </div>
          )}
        </div>
      )})}

      {cancelados.length > 0 && (
        <div className="text-xs text-stone-400 font-semibold text-center mt-2">
          {cancelados.length} pedido{cancelados.length !== 1 ? 's' : ''} cancelado{cancelados.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

// ── SUB-ABA: RESUMO ───────────────────────────────────────────────────────────
function TabResumo({ produtos, pedidosWeb, filtroUnidade }) {
  const base = filtroUnidade && filtroUnidade !== 'Todas'
    ? pedidosWeb.filter(p => p.unidade === filtroUnidade)
    : pedidosWeb
  const totais = getTotaisPorProduto(base)
  const produtosComPedido = produtos
    .filter(p => totais[p.id] > 0)
    .sort((a, b) => a.cod - b.cod)

  if (produtosComPedido.length === 0) return (
    <div className="text-center py-12 text-stone-400">
      <div className="text-4xl mb-3">📦</div>
      <div className="font-bold">Nenhum produto pedido ainda</div>
    </div>
  )

  return (
    <div className="space-y-2">
      <div className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3 text-center">
        O que comprar na Korin
      </div>
      {produtosComPedido.map(prod => {
        const qtdCaixa = prod.qtdCaixa || 0
        const caixasAbertas = prod.caixasAbertas || 0
        const totalPedido = totais[prod.id] || 0
        const caixasNecessarias = qtdCaixa ? Math.ceil(totalPedido / qtdCaixa) : null
        const ok = caixasNecessarias !== null && caixasAbertas >= caixasNecessarias

        return (
          <div key={prod.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ background: CAT_COR[prod.categoria] || '#888' }}>
                {prod.cod}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-stone-800 leading-tight truncate">{prod.nome}</div>
                <div className="text-sm text-stone-500">
                  {totalPedido} unidades pedidas
                  {caixasNecessarias !== null && ` = ${caixasNecessarias} caixa${caixasNecessarias !== 1 ? 's' : ''}`}
                </div>
              </div>
              {caixasNecessarias !== null ? (
                <div className={`text-xs font-black px-2 py-1 rounded-full flex-shrink-0 ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {ok ? `✅ ${caixasAbertas} caixa${caixasAbertas !== 1 ? 's' : ''}` : `⚠️ Faltam ${caixasNecessarias - caixasAbertas}`}
                </div>
              ) : (
                <div className="text-xs font-bold text-stone-400 px-2 py-1 rounded-full bg-stone-100">
                  sem config
                </div>
              )}
            </div>
          </div>
        )
      })}
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
        Esses dados não aparecem pra clientes. Servem pra identificação caso o sistema passe a ter cobrança ou integração com outros serviços no futuro.
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
  const [imagem, setImagem]         = useState(null)
  const [imgBase64, setImgBase64]   = useState(null)
  const [importados, setImportados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState('')
  const [periodoTabela, setPeriodoTabela] = useState(null)
  const [mesmoMes, setMesmoMes]     = useState(true)
  const [dataLimite, setDataLimite] = useState('')

  const handleFile = e => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagem(URL.createObjectURL(file))
    const reader = new FileReader()
    reader.onload = ev => setImgBase64(ev.target.result.split(',')[1])
    reader.readAsDataURL(file)
  }

  const interpretar = async () => {
    if (!imgBase64) return
    setCarregando(true); setErro('')
    try {
      const res  = await fetch('/api/interpretar-catalogo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imagemBase64: imgBase64 })
      })
      const data = await res.json()
      if (data.produtos?.length > 0) {
        const prods = data.produtos.map(p => {
          const exist = produtosAtuais.find(x => x.cod === p.cod)
          return {
            ...p,
            id: exist?.id,
            precoCusto: exist?.precoCusto ?? null,
            qtdCaixa: exist?.qtdCaixa ?? 0,
            caixasAbertas: exist?.caixasAbertas ?? 0,
          }
        })
        setImportados(prods)
        setPeriodoTabela(data.periodo)

        // Compara contra o período corrente DO BANCO — nunca contra o relógio do celular.
        const bate = data.periodo && periodo?.nome && normalizarTexto(data.periodo) === normalizarTexto(periodo.nome)
        setMesmoMes(Boolean(bate))
        setEtapa('preview')
      } else {
        setErro(data.erro || 'Nenhum produto encontrado. Tente com uma foto mais nítida.')
      }
    } catch { setErro('Erro de conexão. Tente novamente.') }
    finally  { setCarregando(false) }
  }

  const confirmarSalvar = async () => {
    if (!mesmoMes && !dataLimite) { toast('Informe a data limite do novo período'); return }
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
      toast(mesmoMes ? 'Catálogo atualizado' : `Período "${periodoTabela}" criado e catálogo importado`)
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
        {!imagem ? (
          <label>
            <div className="border-2 border-dashed border-green-300 rounded-2xl p-10 text-center cursor-pointer active:bg-green-50">
              <div className="text-5xl mb-3">📷</div>
              <div className="text-base font-black text-green-700">Tirar foto ou escolher imagem</div>
              <div className="text-sm text-stone-400 mt-1">Foto da tabela da Korin</div>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
        ) : (
          <div>
            <img src={imagem} alt="Tabela" className="w-full rounded-2xl max-h-60 object-contain bg-stone-50" />
            <button onClick={() => { setImagem(null); setImgBase64(null) }} className="mt-1 text-xs text-stone-400 underline">Trocar imagem</button>
          </div>
        )}
        {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-semibold">{erro}</div>}
        <button onClick={interpretar} disabled={!imgBase64 || carregando}
          className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {carregando ? <><span className="animate-spin inline-block">⟳</span> Interpretando com IA…</> : '🤖 Interpretar com IA'}
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

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {importados.map((p, i) => (
            <div key={p.cod} className="flex items-center gap-3 bg-stone-50 rounded-xl px-3 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-700 text-white flex items-center justify-center text-xs font-black flex-shrink-0">{p.cod}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-stone-800 truncate">{p.nome}</div>
                <div className="text-xs text-stone-400">{p.unidade} · {p.categoria}</div>
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
          <button onClick={confirmarSalvar} disabled={salvando || (!mesmoMes && !dataLimite)}
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
  // está na aba Web e clica em "Completar cadastro" de novo) — antes só lia o
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
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  const [modalImportar, setModalImportar] = useState(false)
  const [unidades, setUnidades] = useState([])
  const recarregarUnidades = useCallback(() => { if (orgId) getUnidades(orgId).then(setUnidades) }, [orgId])
  useEffect(() => { recarregarUnidades() }, [recarregarUnidades])
  const nomesUnidades = unidades.map(u => u.nome)

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
        const peds = await getPedidosCatalogo(periodoCorrente.id)
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
        getPedidosCatalogo(periodoWeb),
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

  const handleCancelar = async id => {
    if (!await confirmar('Cancelar este pedido?')) return
    await cancelarPedido(id)
    const peds = await getPedidosCatalogo(periodoWeb || periodoCorrente?.id)
    setPedidos(peds)
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
    { id: 'produtos',  label: '📦 Embalagens' },
    { id: 'pedidos',   label: `🛒 Pedidos (${pedidos.filter(p => p.status !== 'cancelado').length})` },
    { id: 'resumo',    label: '📊 Resumo' },
    { id: 'unidades',  label: '📍 Unidades' },
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
        <TabProdutos produtos={produtosWeb} pedidosWeb={pedidos} onChange={setProdutosWeb} onSave={handleSaveProdutos} salvando={salvando} somenteLeitura={somenteLeitura} />
      )}
      {subTab === 'pedidos' && (
        <>
          <FiltroUnidade value={filtroUnidade} onChange={setFiltroUnidade} unidades={nomesUnidades} />
          <TabPedidos pedidosWeb={pedidos} produtos={produtosWeb} onCancelar={handleCancelar} loading={loading} filtroUnidade={filtroUnidade} somenteLeitura={somenteLeitura} />
        </>
      )}
      {subTab === 'resumo' && (
        <>
          <FiltroUnidade value={filtroUnidade} onChange={setFiltroUnidade} unidades={nomesUnidades} />
          <TabResumo produtos={produtosWeb} pedidosWeb={pedidos} filtroUnidade={filtroUnidade} />
        </>
      )}
      {subTab === 'unidades' && (
        <UnidadesManager orgId={orgId} modo="settings" onChange={lista => { setUnidades(lista); onUnidadesChange?.(lista) }} />
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
