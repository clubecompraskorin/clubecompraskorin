import { useState, useEffect, useMemo } from 'react'
import { fmt } from './lib/helpers'
import { CAT_COR, CATS_ORDEM, PAGAMENTOS } from './lib/catalog'
import { salvarPedido } from './lib/store'
import { listarClientes } from './lib/clientes'
import { getAlocacoesUnidade, definirAlocacao, getVendidoPdvPorProduto } from './lib/pdv'
import { toast } from './lib/dialog'

// ── CONFIG DE ESTOQUE DA UNIDADE (quanto foi levado pra lá) ────────────────
function ConfigEstoquePdv({ produtos, alocacoes, onFechar, onSalvo }) {
  const [valores, setValores] = useState(() => {
    const v = {}
    produtos.forEach(p => { v[p.id] = alocacoes[p.id] ?? '' })
    return v
  })
  const [salvando, setSalvando] = useState(false)
  const cats = [...new Set([...CATS_ORDEM, ...produtos.map(p => p.categoria)])]

  const salvar = async () => {
    setSalvando(true)
    const mudou = produtos.filter(p => (valores[p.id] || '') !== (alocacoes[p.id] ?? ''))
    for (const p of mudou) {
      await definirAlocacao(p.id, alocacoes._unidadeId, parseInt(valores[p.id]) || 0)
    }
    setSalvando(false)
    onSalvo()
    onFechar()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex flex-col justify-end">
      <div className="bg-stone-50 rounded-t-3xl flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
        <div className="bg-white flex items-center justify-between px-5 py-4 border-b border-stone-100 rounded-t-3xl flex-shrink-0">
          <div>
            <div className="text-lg font-black text-stone-800">📦 Estoque desta unidade</div>
            <div className="text-xs text-stone-400">Quanto de cada produto você está levando pra cá</div>
          </div>
          <button onClick={onFechar} className="p-2 rounded-full bg-stone-100 text-xl">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
          {cats.map(cat => {
            const lista = produtos.filter(p => p.categoria === cat).sort((a, b) => a.cod - b.cod)
            if (!lista.length) return null
            return (
              <div key={cat}>
                <div className="text-xs font-black uppercase tracking-widest mb-2 px-1" style={{ color: CAT_COR[cat] || '#555' }}>{cat}</div>
                <div className="space-y-2">
                  {lista.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-stone-800 truncate">{p.nome}</div>
                        <div className="text-xs text-stone-400">{p.unidade} · {fmt(p.preco)}</div>
                      </div>
                      <input type="number" min="0" placeholder="0" value={valores[p.id]}
                        onChange={e => setValores(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-20 flex-shrink-0 border border-stone-200 rounded-xl px-3 py-2.5 text-base font-bold text-center focus:outline-none focus:border-green-500" />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex-shrink-0 p-4 border-t border-stone-100">
          <button onClick={salvar} disabled={salvando}
            className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 disabled:opacity-50">
            {salvando ? '⟳ Salvando…' : '💾 Salvar estoque desta unidade'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── APP PRINCIPAL DO PDV ─────────────────────────────────────────────────────
export default function ModoPdv({ orgId, org, periodo, produtos, unidades, pedidos, onSalvo, onSair }) {
  const [unidadeAtual, setUnidadeAtual] = useState(null) // { id, nome }
  const [fase, setFase] = useState('produtos') // produtos | membro | pagamento | sucesso
  const [carrinho, setCarrinho] = useState({}) // { produtoId: qty }
  const [busca, setBusca] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [clienteTel, setClienteTel] = useState('')
  const [pagamento, setPagamento] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [alocacoes, setAlocacoes] = useState({})
  const [clientesConhecidos, setClientesConhecidos] = useState([])
  const [mostrarConfig, setMostrarConfig] = useState(false)
  const [ultimaVenda, setUltimaVenda] = useState(null)

  useEffect(() => { if (orgId) listarClientes(orgId).then(setClientesConhecidos) }, [orgId])

  const carregarAlocacoes = async (unidadeId) => {
    const mapa = await getAlocacoesUnidade(periodo.id, unidadeId)
    mapa._unidadeId = unidadeId
    setAlocacoes(mapa)
  }

  useEffect(() => { if (unidadeAtual) carregarAlocacoes(unidadeAtual.id) }, [unidadeAtual?.id])

  const vendidoPdv = useMemo(
    () => unidadeAtual ? getVendidoPdvPorProduto(pedidos, unidadeAtual.nome) : {},
    [pedidos, unidadeAtual?.nome]
  )

  const restante = (produtoId) => {
    const alocado = alocacoes[produtoId]
    if (alocado == null) return null // sem alocação configurada — não mostra número, não avisa
    return alocado - (vendidoPdv[produtoId] || 0) - (carrinho[produtoId] || 0)
  }

  const setQty = (id, qty) => {
    setCarrinho(prev => {
      const n = { ...prev }
      if (qty <= 0) delete n[id]; else n[id] = qty
      return n
    })
  }

  const cats = [...new Set([...CATS_ORDEM, ...produtos.map(p => p.categoria)])]
  const prodFiltrados = produtos
    .filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || p.cod.toString() === busca.trim())
    .sort((a, b) => a.cod - b.cod)

  const itensCarrinho = Object.entries(carrinho).map(([produtoId, qty]) => {
    const p = produtos.find(x => x.id === produtoId)
    return p ? { produtoId, qty, nome: p.nome, preco: p.preco } : null
  }).filter(Boolean)
  const totalCarrinho = itensCarrinho.reduce((s, it) => s + it.preco * it.qty, 0)
  const totalItens = itensCarrinho.reduce((s, it) => s + it.qty, 0)

  const handleNomeMembro = (v) => {
    setClienteNome(v)
    const match = clientesConhecidos.find(c => c.nome.trim().toLowerCase() === v.trim().toLowerCase())
    if (match && !clienteTel.trim()) setClienteTel(match.telefone)
  }

  const novaVenda = () => {
    setCarrinho({}); setClienteNome(''); setClienteTel(''); setPagamento(''); setErro(''); setUltimaVenda(null)
    setFase('produtos')
  }

  const confirmarVenda = async () => {
    if (!clienteNome.trim()) { setErro('Informe o nome do membro'); return }
    if (!pagamento) { setErro('Selecione a forma de pagamento'); return }
    if (itensCarrinho.length === 0) { setErro('Adicione pelo menos 1 produto'); return }
    setSalvando(true); setErro('')
    const agora = new Date().toISOString()
    const r = await salvarPedido(orgId, periodo.id, {
      clienteNome: clienteNome.trim(),
      clienteTel: clienteTel.trim(),
      unidade: unidadeAtual.nome,
      itens: itensCarrinho.map(it => ({ produtoId: it.produtoId, qty: it.qty })),
      pagamento,
      status: 'entregue',
      origem: 'pdv',
      dataPedido: agora,
      dataEntrega: agora,
      entreguePor: org?.responsavelNome || null,
      total: parseFloat(totalCarrinho.toFixed(2)),
    })
    setSalvando(false)
    if (!r.ok) { setErro(`Erro ao salvar: ${r.error}`); return }
    setUltimaVenda({ nome: clienteNome.trim(), total: totalCarrinho })
    onSalvo()
    setFase('sucesso')
  }

  // ── TELA 0: escolher unidade ────────────────────────────────────────────
  if (!unidadeAtual) return (
    <div className="fixed inset-0 bg-stone-50 z-50 flex flex-col overflow-y-auto">
      <div className="bg-green-800 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onSair} className="text-2xl active:opacity-60">←</button>
        <div className="text-lg font-black">🎪 Venda no local</div>
      </div>
      <div className="flex-1 px-5 py-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📍</div>
          <div className="text-xl font-black text-stone-800">Em qual unidade?</div>
          <div className="text-sm text-stone-500 mt-1">A venda vai usar o estoque alocado pra essa unidade</div>
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          {unidades.filter(u => u.aberto !== false).map(u => (
            <button key={u.id} onClick={() => setUnidadeAtual({ id: u.id, nome: u.nome })}
              className="w-full text-left bg-white rounded-2xl border border-stone-200 shadow-sm px-5 py-4 font-bold text-stone-800 active:bg-stone-50">
              {u.nome}
            </button>
          ))}
          {unidades.filter(u => u.aberto !== false).length === 0 && (
            <div className="text-center text-stone-400 text-sm py-8">Nenhuma unidade aberta cadastrada.</div>
          )}
        </div>
      </div>
    </div>
  )

  // ── TELA SUCESSO ─────────────────────────────────────────────────────────
  if (fase === 'sucesso') return (
    <div className="fixed inset-0 bg-stone-50 z-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-4">✅</div>
      <div className="text-2xl font-black text-stone-800 mb-1">Venda registrada!</div>
      <div className="text-lg text-stone-500 mb-8">{ultimaVenda?.nome} · {fmt(ultimaVenda?.total || 0)}</div>
      <button onClick={novaVenda} className="w-full max-w-xs py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 mb-3">
        ➕ Nova venda
      </button>
      <button onClick={onSair} className="text-sm text-stone-400 font-bold underline">Sair do modo venda</button>
    </div>
  )

  // ── TELA MEMBRO ──────────────────────────────────────────────────────────
  if (fase === 'membro') return (
    <div className="fixed inset-0 bg-stone-50 z-50 flex flex-col">
      <div className="bg-green-800 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => setFase('produtos')} className="text-2xl active:opacity-60">←</button>
        <div>
          <div className="text-xs text-green-300 uppercase tracking-widest">📍 {unidadeAtual.nome}</div>
          <div className="text-lg font-black">Quem tá comprando?</div>
        </div>
      </div>
      <div className="flex-1 px-5 py-6 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1.5">Nome do membro</label>
          <input value={clienteNome} onChange={e => handleNomeMembro(e.target.value)} placeholder="Nome completo" list="pdv-clientes" autoFocus
            className="w-full border border-stone-200 rounded-xl px-4 py-3.5 text-lg font-semibold bg-white focus:outline-none focus:border-green-500" />
          <datalist id="pdv-clientes">
            {clientesConhecidos.map(c => <option key={c.telefone || c.nome} value={c.nome} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1.5">Telefone (opcional)</label>
          <input value={clienteTel} onChange={e => setClienteTel(e.target.value)} placeholder="(13) 99999-9999"
            className="w-full border border-stone-200 rounded-xl px-4 py-3.5 text-lg font-semibold bg-white focus:outline-none focus:border-green-500" />
        </div>
        {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold">{erro}</div>}
      </div>
      <div className="flex-shrink-0 p-4 border-t border-stone-100 bg-white">
        <button onClick={() => { if (!clienteNome.trim()) { setErro('Informe o nome do membro'); return }; setErro(''); setFase('pagamento') }}
          className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800">
          Continuar →
        </button>
      </div>
    </div>
  )

  // ── TELA PAGAMENTO ───────────────────────────────────────────────────────
  if (fase === 'pagamento') return (
    <div className="fixed inset-0 bg-stone-50 z-50 flex flex-col">
      <div className="bg-green-800 text-white px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => setFase('membro')} className="text-2xl active:opacity-60">←</button>
        <div>
          <div className="text-xs text-green-300 uppercase tracking-widest">{clienteNome}</div>
          <div className="text-lg font-black">Como vai pagar?</div>
        </div>
      </div>
      <div className="flex-1 px-5 py-6 space-y-3 overflow-y-auto">
        {PAGAMENTOS.filter(p => p !== 'A Definir').map(op => (
          <button key={op} onClick={() => setPagamento(op)}
            className={`w-full py-5 px-6 rounded-2xl border-2 text-left font-black text-lg transition-colors ${pagamento === op ? 'bg-green-700 text-white border-green-700' : 'bg-white text-stone-700 border-stone-200 active:bg-stone-50'}`}>
            {op} {pagamento === op && '✅'}
          </button>
        ))}
        {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-bold">{erro}</div>}
      </div>
      <div className="flex-shrink-0 p-4 border-t border-stone-100 bg-white">
        <button onClick={confirmarVenda} disabled={salvando}
          className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {salvando ? <><span className="animate-spin">⟳</span> Salvando…</> : `✅ Confirmar venda — ${fmt(totalCarrinho)}`}
        </button>
      </div>
    </div>
  )

  // ── TELA PRODUTOS (padrão) ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-stone-50 z-50 flex flex-col">
      <div className="bg-green-800 text-white px-5 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onSair} className="text-2xl active:opacity-60">←</button>
          <div className="flex-1">
            <div className="text-xs text-green-300 uppercase tracking-widest">🎪 Venda no local</div>
            <div className="text-lg font-black">📍 {unidadeAtual.nome}</div>
          </div>
          <button onClick={() => setMostrarConfig(true)} className="text-xs bg-green-700 px-3 py-2 rounded-xl font-bold active:bg-green-600">
            ⚙️ Estoque
          </button>
        </div>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar produto ou código…"
          className="w-full px-4 py-2.5 rounded-xl text-sm bg-white text-stone-800 focus:outline-none" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: totalItens > 0 ? 90 : 20 }}>
        {cats.map(cat => {
          const lista = prodFiltrados.filter(p => p.categoria === cat)
          if (!lista.length) return null
          return (
            <div key={cat}>
              <div className="text-xs font-black uppercase tracking-widest mb-2 px-1" style={{ color: CAT_COR[cat] || '#555' }}>{cat}</div>
              <div className="space-y-2">
                {lista.map(p => {
                  const qty = carrinho[p.id] || 0
                  const rest = restante(p.id)
                  return (
                    <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-3 flex items-center gap-3 ${rest != null && rest < 0 ? 'border-red-300' : 'border-stone-100'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-stone-800 truncate">{p.nome}</div>
                        <div className="text-xs text-stone-400">{fmt(p.preco)} · {p.unidade}</div>
                        {rest != null && (
                          <div className={`text-xs font-bold mt-0.5 ${rest < 0 ? 'text-red-600' : rest === 0 ? 'text-amber-600' : 'text-stone-400'}`}>
                            {rest < 0 ? `⚠️ ${Math.abs(rest)} além do estoque` : `restam ${rest}`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setQty(p.id, qty - 1)} disabled={qty === 0}
                          className="w-9 h-9 rounded-full bg-stone-100 text-stone-600 font-black text-lg active:bg-stone-200 disabled:opacity-30">−</button>
                        <span className="w-6 text-center font-black text-stone-800">{qty}</span>
                        <button onClick={() => setQty(p.id, qty + 1)}
                          className="w-9 h-9 rounded-full bg-green-600 text-white font-black text-lg active:bg-green-700">+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {totalItens > 0 && (
        <button onClick={() => setFase('membro')}
          className="fixed bottom-0 left-0 w-full bg-green-700 text-white px-5 py-4 flex items-center justify-between font-black text-lg active:bg-green-800 z-20">
          <span>🛒 {totalItens} {totalItens !== 1 ? 'itens' : 'item'}</span>
          <span>Continuar — {fmt(totalCarrinho)} →</span>
        </button>
      )}

      {mostrarConfig && (
        <ConfigEstoquePdv produtos={produtos} alocacoes={alocacoes} onFechar={() => setMostrarConfig(false)}
          onSalvo={() => carregarAlocacoes(unidadeAtual.id)} />
      )}
    </div>
  )
}
