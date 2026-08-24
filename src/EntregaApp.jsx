import { useState, useEffect } from 'react'
import { getSlugDaURL } from './CatalogoApp'
import { fmt, calcTotal, sortByCod } from './lib/helpers'
import { PAGAMENTOS } from './lib/catalog'
import { salvarPendente, lerPendente, limparPendente } from './lib/offlinePendente'

const K_PIN   = (u) => `entrega-pin-${u}`
const K_NOME  = 'entrega-nome-representante'
const K_PENDENTE_ENTREGA = (u) => `entrega-confirmacao-pendente-${u}`
const getUnidadeIdDaURL = () => new URLSearchParams(window.location.search).get('u')

async function chamar(endpoint, body) {
  let r
  try {
    r = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // fetch nem chegou a ter resposta — sem conexão, não erro de servidor.
    return { ok: false, semConexao: true, error: 'Sem conexão com internet' }
  }
  try {
    return await r.json()
  } catch {
    return { ok: false, error: 'Resposta inválida do servidor' }
  }
}

function Header({ org, periodo, unidade }) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="flex items-center justify-center gap-4 px-4 py-2 border-b border-stone-100">
        <img src="/logo-clube-unido.png" alt="Clube Unido" className="h-10 w-auto" />
      </div>
      <div className="bg-green-800 text-white text-center px-4 py-2">
        <div className="text-xs text-green-300 uppercase tracking-widest">{org?.nome || 'Clube Unido'} · {periodo?.nome || ''}</div>
        <div className="text-base font-black">📍 {unidade?.nome || ''}</div>
      </div>
    </header>
  )
}

// ── TELA: ENTRAR COM PIN ─────────────────────────────────────────────────────
function TelaPin({ onEntrou, erroInicial }) {
  const [pin, setPin]   = useState('')
  const [nome, setNome] = useState(() => localStorage.getItem(K_NOME) || '')
  const [erro, setErro] = useState(erroInicial || '')
  const [entrando, setEntrando] = useState(false)

  const entrar = async () => {
    if (!nome.trim())        { setErro('Informe seu nome'); return }
    if (pin.trim().length !== 4) { setErro('PIN deve ter 4 dígitos'); return }
    setErro('')
    setEntrando(true)
    const ok = await onEntrou(pin.trim(), nome.trim())
    if (!ok) setErro('PIN inválido — confira com quem organiza o grupo')
    setEntrando(false)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6">
      <img src="/logo-clube-unido.png" alt="Clube Unido" className="h-16 w-auto mb-6" />
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-md p-6 space-y-4">
        <div className="text-center">
          <div className="text-2xl mb-1">🚚</div>
          <h1 className="text-lg font-black text-stone-800">Entrega da unidade</h1>
          <p className="text-sm text-stone-500 mt-1">Digite seu nome e o PIN da unidade pra ver os pedidos</p>
        </div>
        <div>
          <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-1.5">Seu nome</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-base font-semibold text-stone-800 placeholder-stone-400 focus:outline-none focus:border-green-600" />
        </div>
        <div>
          <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-1.5">PIN da unidade</label>
          <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000"
            inputMode="numeric" autoFocus
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-2xl font-black text-center tracking-[0.5em] text-stone-800 placeholder-stone-300 focus:outline-none focus:border-green-600" />
        </div>
        {erro && <div className="text-sm text-red-600 font-bold text-center">{erro}</div>}
        <button onClick={entrar} disabled={entrando}
          className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 disabled:opacity-50">
          {entrando ? 'Entrando…' : 'Entrar →'}
        </button>
      </div>
    </div>
  )
}

// ── MODO ENTREGA — 3 etapas (mesma lógica do painel, escrita via API pública) ─
function ModoEntregaPublico({ pedido, produtos, nomeRepresentante, onCancelar, onFinalizar }) {
  const [etapa, setEtapa]   = useState(1)
  const [itens, setItens]   = useState(pedido.itens.map(i => ({ ...i })))
  const [pagamento, setPagamento] = useState(pedido.pagamento || 'PIX')
  const [troco, setTroco]   = useState('')
  const [obs, setObs]       = useState(pedido.obs || '')
  const [enviando, setEnviando] = useState(false)

  const total = itens.reduce((s, it) => {
    const p = produtos.find(x => x.id === it.produtoId)
    return s + (p ? p.preco * it.qty : 0)
  }, 0)

  const setQty = (produtoId, qty) => {
    if (qty <= 0) setItens(prev => prev.filter(i => i.produtoId !== produtoId))
    else setItens(prev => prev.map(i => i.produtoId === produtoId ? { ...i, qty } : i))
  }

  const itensSorted = sortByCod(itens, produtos)

  const confirmar = async () => {
    setEnviando(true)
    const trocoVal = pagamento === 'Dinheiro' && troco ? (parseFloat(troco) - total).toFixed(2) : null
    await onFinalizar(itens, pagamento, trocoVal, obs)
    setEnviando(false)
  }

  if (etapa === 1) return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onCancelar} className="text-stone-400 text-2xl active:text-stone-600">←</button>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-black text-stone-800 truncate">{pedido.clienteNome}</div>
          {pedido.clienteTel && <div className="text-xs text-stone-400">📱 {pedido.clienteTel}</div>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-stone-400 font-bold">ETAPA 1 DE 3</div>
          <div className="text-base font-black text-green-700">{fmt(total)}</div>
        </div>
      </div>
      <div className="flex gap-1.5">
        {[1,2,3].map(e => <div key={e} className={`flex-1 h-1.5 rounded-full ${e <= etapa ? 'bg-green-600' : 'bg-stone-200'}`}/>)}
      </div>
      <div className="text-xs font-black text-stone-400 uppercase tracking-widest">Conferir Itens</div>
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-50">
        {itensSorted.map(it => {
          const p = produtos.find(x => x.id === it.produtoId)
          if (!p) return null
          return (
            <div key={it.produtoId} className="flex items-center px-4 py-3 gap-3">
              <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-black flex-shrink-0">{p.cod}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-stone-800 leading-tight">{p.nome}</div>
                <div className="text-xs text-stone-400">{fmt(p.preco)}</div>
              </div>
              <div className="flex-shrink-0 text-xs font-black text-green-700 mr-2">{fmt(p.preco * it.qty)}</div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <button onClick={() => setQty(it.produtoId, it.qty - 1)} className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 font-black text-lg flex items-center justify-center active:bg-stone-200">−</button>
                <span className="text-base font-black text-green-700 w-5 text-center">{it.qty}</span>
                <button onClick={() => setQty(it.produtoId, it.qty + 1)} className="w-8 h-8 rounded-full bg-green-600 text-white font-black text-lg flex items-center justify-center active:bg-green-700">+</button>
              </div>
            </div>
          )
        })}
        {itens.length === 0 && <div className="px-4 py-6 text-center text-stone-400 text-sm">Nenhum item</div>}
      </div>
      <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Observação (opcional)…"
        className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 bg-white"/>
      <button onClick={() => setEtapa(2)} disabled={itens.length === 0}
        className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 disabled:opacity-40">
        Confirmar Itens → {fmt(total)}
      </button>
    </div>
  )

  if (etapa === 2) return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setEtapa(1)} className="text-stone-400 text-2xl active:text-stone-600">←</button>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-black text-stone-800 truncate">{pedido.clienteNome}</div>
        </div>
        <div className="text-xs text-stone-400 font-bold flex-shrink-0">ETAPA 2 DE 3</div>
      </div>
      <div className="flex gap-1.5">
        {[1,2,3].map(e => <div key={e} className={`flex-1 h-1.5 rounded-full ${e <= etapa ? 'bg-green-600' : 'bg-stone-200'}`}/>)}
      </div>
      <div className="bg-green-800 text-white rounded-3xl p-5 text-center">
        <div className="text-sm text-green-300 font-bold">TOTAL A RECEBER</div>
        <div className="text-5xl font-black mt-1">{fmt(total)}</div>
      </div>
      <div className="text-xs font-black text-stone-400 uppercase tracking-widest">Forma de Pagamento</div>
      <div className="grid grid-cols-2 gap-2">
        {PAGAMENTOS.filter(p => p !== 'A Definir').map(p => (
          <button key={p} onClick={() => setPagamento(p)}
            className={`py-4 rounded-2xl font-black text-base transition-colors ${pagamento === p ? 'bg-green-700 text-white' : 'bg-white text-stone-600 border border-stone-200 active:bg-stone-50'}`}>
            {p === 'PIX' ? '📱 PIX' : p === 'Dinheiro' ? '💵 Dinheiro' : p === 'Cartão Crédito' ? '💳 Crédito' : '💳 Débito'}
          </button>
        ))}
      </div>
      {pagamento === 'Dinheiro' && (
        <div>
          <div className="text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Valor Recebido (pra calcular troco)</div>
          <input value={troco} onChange={e => setTroco(e.target.value)} placeholder={`Ex: ${(Math.ceil(total / 10) * 10).toFixed(2)}`}
            type="number" step="0.01"
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-xl font-bold focus:outline-none focus:border-green-500 bg-white"/>
          {troco && parseFloat(troco) >= total && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
              <div className="text-xs text-amber-600 font-bold">TROCO</div>
              <div className="text-3xl font-black text-amber-700">{fmt(parseFloat(troco) - total)}</div>
            </div>
          )}
        </div>
      )}
      <button onClick={() => setEtapa(3)}
        className="w-full py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800">
        Próximo → Finalizar
      </button>
    </div>
  )

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setEtapa(2)} className="text-stone-400 text-2xl active:text-stone-600">←</button>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-black text-stone-800 truncate">{pedido.clienteNome}</div>
        </div>
        <div className="text-xs text-stone-400 font-bold flex-shrink-0">ETAPA 3 DE 3</div>
      </div>
      <div className="flex gap-1.5">
        {[1,2,3].map(e => <div key={e} className={`flex-1 h-1.5 rounded-full ${e <= etapa ? 'bg-green-600' : 'bg-stone-200'}`}/>)}
      </div>
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-2">
        <div className="text-xs font-black text-stone-400 uppercase tracking-widest mb-2">Resumo Final</div>
        {itensSorted.map(it => {
          const p = produtos.find(x => x.id === it.produtoId)
          if (!p) return null
          return (
            <div key={it.produtoId} className="flex justify-between text-sm">
              <span className="text-stone-700"><span className="text-xs bg-stone-100 text-stone-500 px-1 rounded font-black mr-1">{p.cod}</span>{it.qty}× {p.nome}</span>
              <span className="font-black text-stone-700">{fmt(p.preco * it.qty)}</span>
            </div>
          )
        })}
        <div className="border-t border-stone-100 pt-2 flex justify-between font-black text-base">
          <span>Total</span><span className="text-green-700">{fmt(total)}</span>
        </div>
        <div className="flex justify-between text-sm text-stone-500">
          <span>Pagamento</span><span className="font-bold text-stone-700">{pagamento}</span>
        </div>
        {pagamento === 'Dinheiro' && troco && parseFloat(troco) >= total && (
          <div className="flex justify-between text-sm text-stone-500">
            <span>Troco</span><span className="font-bold text-amber-700">{fmt(parseFloat(troco) - total)}</span>
          </div>
        )}
        {obs && <div className="text-xs text-stone-400 italic mt-1">"{obs}"</div>}
        <div className="text-xs text-stone-400 mt-1">Confirmado por {nomeRepresentante}</div>
      </div>
      <button onClick={confirmar} disabled={enviando}
        className="w-full py-5 bg-green-700 text-white rounded-2xl font-black text-xl active:bg-green-800 shadow-lg disabled:opacity-50">
        {enviando ? 'Enviando…' : '✅ Confirmar Entrega e Recebimento'}
      </button>
    </div>
  )
}

// ── TELA PRINCIPAL: LISTA DE PEDIDOS DA UNIDADE ──────────────────────────────
function TelaLista({ dados, nomeRepresentante, onConfirmarEntrega, onSair, pendenteEnvio }) {
  const [pedidoAberto, setPedidoAberto] = useState(null)
  const { org, periodo, unidade, produtos, pedidos } = dados

  if (pedidoAberto) {
    return (
      <ModoEntregaPublico
        pedido={pedidoAberto}
        produtos={produtos}
        nomeRepresentante={nomeRepresentante}
        onCancelar={() => setPedidoAberto(null)}
        onFinalizar={async (itens, pagamento, troco, obs) => {
          const ok = await onConfirmarEntrega(pedidoAberto.id, itens, pagamento, troco, obs)
          if (ok) setPedidoAberto(null)
        }}
      />
    )
  }

  const pendentes = pedidos.filter(p => p.status === 'pendente').sort((a, b) => a.clienteNome.localeCompare(b.clienteNome))
  const entregues = pedidos.filter(p => p.status === 'entregue').sort((a, b) => a.clienteNome.localeCompare(b.clienteNome))

  return (
    <div className="min-h-screen bg-stone-100 pb-10">
      <Header org={org} periodo={periodo} unidade={unidade} />
      <div className="px-4 py-4">
        {pendenteEnvio && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 text-center text-amber-700 font-bold text-sm">
            📤 1 confirmação de entrega aguardando envio — sem conexão agora, vai ser enviada
            sozinha assim que a internet voltar.
          </div>
        )}
        {pedidos.length === 0 && (
          <div className="text-center py-16 text-stone-400 space-y-2">
            <div className="text-5xl">📦</div>
            <p className="text-sm font-bold">Nenhum pedido pra essa unidade neste período</p>
          </div>
        )}
        {pendentes.length > 0 && <>
          <div className="text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 text-amber-600">⏰ Pendentes · {pendentes.length}</div>
          {pendentes.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm mb-3 overflow-hidden">
              <button className="w-full text-left p-4" onClick={() => setPedidoAberto(p)}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-2xl font-black text-stone-800">{p.clienteNome}</div>
                    {p.clienteTel && <div className="text-sm text-stone-400 mt-0.5">📱 {p.clienteTel}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-green-700">{fmt(calcTotal(p, produtos))}</div>
                    <div className="text-xs text-amber-600 font-bold mt-0.5">{p.itens.length} item(ns) · Toque para entregar →</div>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </>}
        {entregues.length > 0 && <>
          <div className="text-xs font-black uppercase tracking-widest mb-2 mt-4 flex items-center gap-1.5 text-green-600">✅ Entregues · {entregues.length}</div>
          {entregues.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-green-200 shadow-sm mb-3 overflow-hidden p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xl font-black text-stone-700">{p.clienteNome}</div>
                  <div className="text-xs text-green-600 font-bold mt-0.5">✅ {p.pagamento}{p.troco ? ` · Troco R$${p.troco}` : ''}</div>
                  {p.entreguePor && <div className="text-xs text-stone-400 mt-0.5">Por {p.entreguePor}</div>}
                </div>
                <div className="text-lg font-black text-green-700">{fmt(calcTotal(p, produtos))}</div>
              </div>
            </div>
          ))}
        </>}
        <button onClick={onSair} className="w-full mt-6 py-2 text-xs text-stone-400 font-bold underline">Trocar PIN / sair</button>
      </div>
    </div>
  )
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function EntregaApp() {
  const [slug]      = useState(() => getSlugDaURL())
  const [unidadeId] = useState(() => getUnidadeIdDaURL())
  const [auth, setAuth]   = useState(null) // { pin, nome }
  const [dados, setDados] = useState(null) // resposta de entrega-lista
  const [erro, setErro]   = useState('')
  const [pendenteEnvio, setPendenteEnvio] = useState(false)

  const carregar = async (pin, nome) => {
    setErro('')
    const r = await chamar('entrega-lista', { slug, unidadeId, pin })
    if (!r.ok) { setErro(r.error || 'Erro ao carregar'); return false }
    setAuth({ pin, nome })
    setDados(r)
    localStorage.setItem(K_PIN(unidadeId), pin)
    localStorage.setItem(K_NOME, nome)
    return true
  }

  useEffect(() => {
    if (!slug || !unidadeId) return
    const pinSalvo  = localStorage.getItem(K_PIN(unidadeId))
    const nomeSalvo = localStorage.getItem(K_NOME)
    if (pinSalvo && nomeSalvo) carregar(pinSalvo, nomeSalvo)
  }, [slug, unidadeId])

  // A confirmação em si é idempotente (update por pedidoId — reenviar de
  // novo com o mesmo payload não duplica nem corrompe nada), então não
  // precisa de id de idempotência como o pedido novo do catálogo precisa.
  const enviarConfirmacao = async (payload) => {
    const r = await chamar('entrega-confirmar', payload)
    if (r.semConexao) {
      salvarPendente(K_PENDENTE_ENTREGA(unidadeId), payload)
      setPendenteEnvio(true)
      return { semConexao: true }
    }
    limparPendente(K_PENDENTE_ENTREGA(unidadeId))
    setPendenteEnvio(false)
    if (!r.ok) return { ok: false, error: r.error }
    return { ok: true }
  }

  // Reenvia sozinha uma confirmação de entrega que ficou pendente de uma
  // tentativa anterior sem conexão — ao reabrir a página, e quando a
  // internet voltar enquanto ela ainda está aberta.
  useEffect(() => {
    if (!unidadeId || !auth) return
    const pendente = lerPendente(K_PENDENTE_ENTREGA(unidadeId))
    if (!pendente) return
    setPendenteEnvio(true)
    const tentar = async () => {
      const res = await enviarConfirmacao(pendente)
      if (res.ok) await carregar(auth.pin, auth.nome)
    }
    tentar()
    window.addEventListener('online', tentar)
    return () => window.removeEventListener('online', tentar)
  }, [unidadeId, auth])

  const confirmarEntrega = async (pedidoId, itens, pagamento, troco, obs) => {
    const payload = { slug, unidadeId, pin: auth.pin, pedidoId, entreguePor: auth.nome, itens, pagamento, troco, obs }
    const res = await enviarConfirmacao(payload)
    // Sem conexão: já guardado pra reenvio — libera a tela em vez de travar
    // o representante esperando sinal voltar (é exatamente esse o cenário:
    // ele está de pé, na porta, apressado).
    if (res.semConexao) return true
    if (!res.ok) { setErro(res.error || 'Erro ao confirmar entrega'); return false }
    await carregar(auth.pin, auth.nome)
    return true
  }

  const sair = () => {
    localStorage.removeItem(K_PIN(unidadeId))
    setAuth(null)
    setDados(null)
  }

  if (!slug || !unidadeId) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6 text-center">
        <div className="text-stone-500 font-bold">Link inválido. Peça um novo link pra Dedicante.</div>
      </div>
    )
  }

  if (!dados) {
    return <TelaPin onEntrou={carregar} erroInicial={erro} />
  }

  return (
    <>
      {erro && (
        <div className="fixed top-2 left-2 right-2 z-50 bg-red-600 text-white text-sm font-bold rounded-xl px-4 py-2.5 text-center shadow-lg">
          {erro}
        </div>
      )}
      <TelaLista dados={dados} nomeRepresentante={auth.nome} onConfirmarEntrega={confirmarEntrega} onSair={sair} pendenteEnvio={pendenteEnvio} />
    </>
  )
}
