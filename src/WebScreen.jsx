import { useState, useEffect, useCallback } from 'react'
import { loadConfigWeb, saveConfigWeb, getPedidosWeb, cancelarPedidoWeb, getTotaisPorProduto, listPeriodosWeb } from './lib/store-web'
import { getPwaInstallCount } from './lib/pwa'
import { CAT_COR, CATS_ORDEM } from './lib/catalog'

const fmt = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',')
const fmtData = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : ''

const UNIDADES_FILTRO = ['Todas', 'JC Itanhaém', 'JC Mongaguá', 'Difusão Praia Grande', 'Igreja São Vicente']

function FiltroUnidade({ value, onChange }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 min-w-max pb-1">
        {UNIDADES_FILTRO.map(u => (
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
function TabControles({ config, onChange, onSave, salvando }) {
  const linkCatalogo = window.location.origin + '/pedido'
  const [instalacoes, setInstalacoes] = useState(null)
  useEffect(() => { getPwaInstallCount('catalogo').then(setInstalacoes) }, [])

  const toggle = async () => {
    const nova = { ...config, aberto: !config.aberto }
    onChange(nova)
    await saveConfigWeb(nova)
  }

  return (
    <div className="space-y-4">
      {/* Open/Close */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
        <div className="text-xs font-black text-stone-400 uppercase tracking-widest mb-3">Status do período</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-stone-800">{config.periodo}</div>
            <div className={`text-base font-bold mt-0.5 ${config.aberto ? 'text-green-600' : 'text-red-500'}`}>
              {config.aberto ? '🟢 Aberto para pedidos' : '🔴 Fechado'}
            </div>
          </div>
          <button onClick={toggle}
            className={`px-5 py-3 rounded-2xl font-black text-base transition-colors ${config.aberto ? 'bg-red-100 text-red-700 active:bg-red-200' : 'bg-green-600 text-white active:bg-green-700'}`}>
            {config.aberto ? 'Fechar' : 'Abrir'}
          </button>
        </div>
      </div>

      {/* Período */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-3">
        <div className="text-xs font-black text-stone-400 uppercase tracking-widest">Configurações</div>

        <div>
          <label className="block text-sm font-bold text-stone-600 mb-1">Nome do período</label>
          <input
            value={config.periodo}
            onChange={e => onChange({ ...config, periodo: e.target.value })}
            placeholder="Ex: Julho/2026"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-stone-600 mb-1">
            Data limite para pedidos
            {config.data_limite && <span className="text-stone-400 font-normal ml-1">(até {fmtData(config.data_limite)})</span>}
          </label>
          <input
            type="date"
            value={config.data_limite || ''}
            onChange={e => onChange({ ...config, data_limite: e.target.value || null })}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-green-500"
          />
          {config.data_limite && (
            <button onClick={() => onChange({ ...config, data_limite: null })}
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
          onClick={() => navigator.clipboard?.writeText(linkCatalogo).then(() => alert('Link copiado!'))}
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
    </div>
  )
}

// ── SUB-ABA: PRODUTOS ─────────────────────────────────────────────────────────
function TabProdutos({ config, produtos, pedidosWeb, onChange, onSave, salvando }) {
  const totais = getTotaisPorProduto(pedidosWeb)

  const setProdCfg = (cod, campo, val) => {
    const n = parseInt(val) || 0
    onChange({
      ...config,
      produtos: {
        ...config.produtos,
        [String(cod)]: {
          ...config.produtos?.[String(cod)],
          [campo]: n,
        }
      }
    })
  }

  const addCaixa = (cod) => {
    const atual = config.produtos?.[String(cod)]?.caixasAbertas || 0
    onChange({
      ...config,
      produtos: {
        ...config.produtos,
        [String(cod)]: {
          ...config.produtos?.[String(cod)],
          caixasAbertas: atual + 1,
        }
      }
    })
  }

  const cats = [...new Set([...CATS_ORDEM, ...produtos.map(p => p.categoria)])]

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-700 font-semibold">
        Configure quantas unidades vêm em cada embalagem fechada da Korin e quantas caixas estão disponíveis por produto.
      </div>

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
                const cfg = config.produtos?.[String(prod.cod)] || {}
                const qtdCaixa = cfg.qtdCaixa || 0
                const caixasAbertas = cfg.caixasAbertas || 0
                const totalPedido = totais[prod.cod] || 0
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
                          onChange={e => setProdCfg(prod.cod, 'qtdCaixa', e.target.value)}
                          placeholder="0 = sem limite"
                          className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-base font-bold focus:outline-none focus:border-green-500"
                        />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <label className="block text-xs font-bold text-stone-500 mb-1">Caixas abertas</label>
                        <div className="flex gap-1 min-w-0">
                          <input
                            type="number" min="0" value={caixasAbertas || ''}
                            onChange={e => setProdCfg(prod.cod, 'caixasAbertas', e.target.value)}
                            className="w-0 flex-1 min-w-0 border border-stone-200 rounded-xl px-3 py-2.5 text-base font-bold focus:outline-none focus:border-green-500"
                          />
                          <button onClick={() => addCaixa(prod.cod)}
                            className="px-2 py-2.5 bg-green-600 text-white rounded-xl font-black text-sm active:bg-green-700 flex-shrink-0">
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

      <button onClick={onSave} disabled={salvando}
        className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 disabled:opacity-50">
        {salvando ? '⟳ Salvando…' : '💾 Salvar configuração de produtos'}
      </button>
    </div>
  )
}

// ── SUB-ABA: PEDIDOS ──────────────────────────────────────────────────────────
function TabPedidos({ pedidosWeb, onCancelar, loading, filtroUnidade }) {
  const base = filtroUnidade && filtroUnidade !== 'Todas'
    ? pedidosWeb.filter(p => p.unidade === filtroUnidade)
    : pedidosWeb
  const ativos = base.filter(p => p.status !== 'cancelado')
  const cancelados = base.filter(p => p.status === 'cancelado')
  const totalGeral = ativos.reduce((s, p) => s + (p.total || 0), 0)

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
      {ativos.map(pedido => (
        <div key={pedido.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3">
            <div className="flex justify-between items-start mb-1">
              <div className="text-xl font-black text-stone-800">{pedido.nome}</div>
              <div className="text-lg font-black text-green-700 ml-2">{fmt(pedido.total || 0)}</div>
            </div>
            <div className="text-sm text-stone-500">
              📍 {pedido.unidade} · 💳 {pedido.pagamento}
            </div>
            {pedido.telefone && (
              <div className="text-sm text-stone-400">📱 {pedido.telefone}</div>
            )}
            <div className="text-xs text-stone-300 mt-0.5">
              {new Date(pedido.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              {pedido.updated_at !== pedido.created_at && ' (editado)'}
            </div>
          </div>
          <div className="px-4 pb-3">
            {pedido.itens.sort((a, b) => a.cod - b.cod).map(it => (
              <div key={it.cod} className="flex justify-between text-sm py-0.5">
                <span className="text-stone-800 font-semibold">
                  <span className="text-xs bg-stone-100 px-1 rounded font-bold mr-1">{it.cod}</span>
                  {it.qty}× {it.nome}
                </span>
                <span className="text-stone-700 font-bold">{fmt(it.preco * it.qty)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-50 px-4 py-2">
            <button onClick={() => onCancelar(pedido.id)}
              className="text-xs text-red-400 font-bold active:text-red-600">
              Cancelar pedido
            </button>
          </div>
        </div>
      ))}

      {cancelados.length > 0 && (
        <div className="text-xs text-stone-400 font-semibold text-center mt-2">
          {cancelados.length} pedido{cancelados.length !== 1 ? 's' : ''} cancelado{cancelados.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

// ── SUB-ABA: RESUMO ───────────────────────────────────────────────────────────
function TabResumo({ config, produtos, pedidosWeb, filtroUnidade }) {
  const base = filtroUnidade && filtroUnidade !== 'Todas'
    ? pedidosWeb.filter(p => p.unidade === filtroUnidade)
    : pedidosWeb
  const totais = getTotaisPorProduto(base)
  const produtosComPedido = produtos
    .filter(p => totais[p.cod] > 0)
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
        const cfgProd = config.produtos?.[String(prod.cod)] || {}
        const qtdCaixa = cfgProd.qtdCaixa || 0
        const caixasAbertas = cfgProd.caixasAbertas || 0
        const totalPedido = totais[prod.cod] || 0
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

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function WebScreen({ produtos }) {
  const [subTab, setSubTab]               = useState('controles')
  const [config, setConfig]               = useState(null)
  const [pedidos, setPedidos]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [salvando, setSalvando]           = useState(false)
  const [filtroUnidade, setFiltroUnidade] = useState('Todas')
  const [periodoWeb, setPeriodoWeb]       = useState(null)   // null = config.periodo
  const [periodosWeb, setPeriodosWeb]     = useState([])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const cfg = await loadConfigWeb()
      setConfig(cfg)
      setPeriodoWeb(cfg.periodo)
      const peds = await getPedidosWeb(cfg.periodo)
      setPedidos(peds)
      const pw = await listPeriodosWeb()
      // Merge config period with web periods
      const allPeriods = [...new Set([cfg.periodo, ...pw])]
      setPeriodosWeb(allPeriods)
      setLoading(false)
    }
    init()
  }, [])

  // Recarrega pedidos quando troca de aba ou de período
  useEffect(() => {
    if (!periodoWeb || !['pedidos', 'resumo'].includes(subTab)) return
    getPedidosWeb(periodoWeb).then(setPedidos)
  }, [subTab, periodoWeb])

  // Recarrega quando periodoWeb muda em qualquer sub-aba
  useEffect(() => {
    if (!periodoWeb) return
    getPedidosWeb(periodoWeb).then(setPedidos)
  }, [periodoWeb])

  const handleSave = async () => {
    setSalvando(true)
    await saveConfigWeb(config)
    setSalvando(false)
  }

  const handleCancelar = async id => {
    if (!window.confirm('Cancelar este pedido?')) return
    await cancelarPedidoWeb(id)
    const peds = await getPedidosWeb(config.periodo)
    setPedidos(peds)
  }

  if (loading || !config) return (
    <div className="px-4 py-12 text-center text-stone-400 font-bold animate-pulse">Carregando…</div>
  )

  const TABS = [
    { id: 'controles', label: '⚙️ Config' },
    { id: 'produtos',  label: '📦 Embalagens' },
    { id: 'pedidos',   label: `🛒 Pedidos (${pedidos.filter(p => p.status !== 'cancelado').length})` },
    { id: 'resumo',    label: '📊 Resumo' },
  ]

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Seletor de período Web */}
      {periodosWeb.length > 1 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 min-w-max pb-1">
            {periodosWeb.map(p => (
              <button key={p} onClick={() => setPeriodoWeb(p)}
                className={`px-3 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${periodoWeb === p ? 'bg-green-700 text-white' : 'bg-white text-stone-500 border border-stone-200 active:bg-stone-50'}`}>
                {p}{p === config?.periodo ? ' ●' : ''}
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
      {subTab === 'controles' && (
        <TabControles config={config} onChange={setConfig} onSave={handleSave} salvando={salvando} />
      )}
      {subTab === 'produtos' && (
        <TabProdutos config={config} produtos={produtos} pedidosWeb={pedidos} onChange={setConfig} onSave={handleSave} salvando={salvando} />
      )}
      {subTab === 'pedidos' && (
        <>
          <FiltroUnidade value={filtroUnidade} onChange={setFiltroUnidade} />
          <TabPedidos pedidosWeb={pedidos} onCancelar={handleCancelar} loading={loading} filtroUnidade={filtroUnidade} />
        </>
      )}
      {subTab === 'resumo' && (
        <>
          <FiltroUnidade value={filtroUnidade} onChange={setFiltroUnidade} />
          <TabResumo config={config} produtos={produtos} pedidosWeb={pedidos} filtroUnidade={filtroUnidade} />
        </>
      )}
    </div>
  )
}
