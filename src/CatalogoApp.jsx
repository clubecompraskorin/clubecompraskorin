import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { PRODUTOS_INICIAIS, CAT_COR, CATS_ORDEM } from './lib/catalog'
import {
  loadConfigWeb, loadClienteDados, saveClienteDados,
  getPedidosWeb, savePedidoWeb, getPedidoByTelefone,
  getTotaisPorProduto, isPeriodoFechado, getProdutosWeb,
} from './lib/store-web'
import { useInstallPrompt } from './lib/pwa'

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const UNIDADES = ['JC Itanhaém', 'JC Mongaguá', 'Difusão Praia Grande', 'Igreja São Vicente']
const PAGAMENTOS_CLI = ['PIX', 'Dinheiro', 'Cartão Crédito', 'Cartão Débito']
const fmt = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',')

// ── HELPERS VISUAIS ───────────────────────────────────────────────────────────
function Header({ config }) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="flex items-center justify-center gap-4 px-4 py-2 border-b border-stone-100">
        <img src="/logo-lattuga.png" alt="Lattuga Orgânicos" className="h-10 w-auto" />
        <img src="/logo-korin.png"   alt="Korin"             className="h-9 w-auto" />
      </div>
      <div className="bg-green-800 text-white text-center px-4 py-2">
        <div className="text-xs text-green-300 uppercase tracking-widest">Clube de Compras Korin</div>
        <div className="text-base font-black">{config?.periodo || ''}</div>
      </div>
    </header>
  )
}

function Rodape() {
  return (
    <footer className="bg-green-900 flex items-center justify-between px-3 py-1.5 mt-4">
      <span className="text-green-400 font-semibold whitespace-nowrap" style={{ fontSize: '10px' }}>
        © Todos os Direitos Reservados —{' '}
        <a href="https://lattuga-organicos.vercel.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
          Lattuga Orgânicos
        </a>
      </span>
      <a href="https://www.personalsupport.tec.br/" target="_blank" rel="noopener noreferrer"
        className="text-green-300 font-bold hover:text-white underline flex-shrink-0 ml-2 whitespace-nowrap" style={{ fontSize: '10px' }}>
        Desenvolvido por Personal Support
      </a>
    </footer>
  )
}

// ── TELA FECHADA ──────────────────────────────────────────────────────────────
function TelaFechada({ config, showInstall, iosInstall, install, dismiss }) {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Header config={config} />
      {/* Banner instalação PWA */}
      {(showInstall === true || showInstall === 'manual') && (
        <div className="mx-4 mt-3 rounded-2xl shadow-lg overflow-hidden">
          {showInstall === true && !iosInstall && (
            <div className="bg-green-700 text-white p-3 flex items-center gap-3">
              <img src="/logo-korin.png" alt="" className="w-10 h-10 rounded-xl flex-shrink-0 bg-white p-1" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black">Instale o Clube Korin</div>
                <button onClick={install} className="text-xs bg-white text-green-700 font-black px-3 py-1.5 rounded-full mt-1.5 block active:bg-green-100">📲 Instalar agora</button>
              </div>
              <button onClick={dismiss} className="text-green-300 text-2xl">✕</button>
            </div>
          )}
          {(showInstall === 'manual' || iosInstall) && (
            <div className="bg-white border-2 border-green-600 p-4">
              <div className="text-sm font-black text-green-800 mb-2">📲 Instalar o Clube Korin</div>
              {iosInstall ? (
                <div className="text-sm text-stone-600">Toque em <strong>Compartilhar ↑</strong> → <strong>"Adicionar à tela de início"</strong></div>
              ) : (
                <div className="text-sm text-stone-600 space-y-1">
                  <div>1. Toque nos <strong>⋮ três pontinhos</strong> do Chrome</div>
                  <div>2. Toque em <strong>"Adicionar à tela inicial"</strong></div>
                  <div>3. Confirme tocando em <strong>"Adicionar"</strong></div>
                </div>
              )}
              <button onClick={dismiss} className="mt-2 text-xs text-stone-400 underline">Fechar</button>
            </div>
          )}
        </div>
      )}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-12">
        <div className="text-6xl mb-6">📦</div>
        <div className="text-3xl font-black text-stone-700 mb-3">Pedidos encerrados</div>
        <div className="text-xl text-stone-500 mb-6 leading-relaxed">
          Os pedidos para o período <strong className="text-green-700">{config?.periodo}</strong> estão encerrados.
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-5 max-w-sm w-full">
          <div className="text-base text-green-800 font-semibold">
            Aguarde o próximo período ou fale com a coordenadora do grupo.
          </div>
        </div>
      </div>
      <Rodape />
    </div>
  )
}

// ── CARD DE PRODUTO ───────────────────────────────────────────────────────────
function ProdutoCard({ produto, qty, onSetQty, disponivel, qtdCaixa }) {
  const esgotado = disponivel === 0 && qty === 0
  const mostrarInfo = qtdCaixa > 0
  // extras = quantas unidades ainda podem ser adicionadas além do que já está no carrinho
  const extras = disponivel === Infinity ? Infinity : Math.max(0, disponivel - qty)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm mb-3 overflow-hidden transition-opacity ${esgotado ? 'opacity-50' : ''}`}>
      <div className="p-4">
        {/* Nome e preço */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-base flex-shrink-0"
            style={{ background: CAT_COR[produto.categoria] || '#888' }}>
            {produto.cod}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold text-stone-800 leading-snug">{produto.nome}</div>
            <div className="text-base text-stone-400 mt-0.5">{produto.unidade}</div>
            {mostrarInfo && (
              <div className="flex gap-3 mt-1.5 flex-wrap">
                <span className="text-sm bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                  📦 {qtdCaixa} por embalagem
                </span>
                {extras !== Infinity && extras > 0 && (
                  <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    {extras} disponível{extras !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="text-xl font-black text-green-700 flex-shrink-0 ml-1">{fmt(produto.preco)}</div>
        </div>

        {/* Controles */}
        {esgotado ? (
          <div className="flex justify-end">
            <span className="bg-red-50 text-red-500 font-bold text-base px-5 py-2.5 rounded-full border border-red-100">
              Esgotado
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {qty > 0 ? (
              <div className="text-lg font-bold text-stone-500">{fmt(produto.preco * qty)}</div>
            ) : <div />}
            <div className="flex items-center gap-3">
              {qty > 0 && (
                <>
                  <button onClick={() => onSetQty(produto.cod, qty - 1)}
                    className="w-14 h-14 rounded-full bg-stone-100 text-stone-600 font-black text-3xl flex items-center justify-center active:bg-stone-200">
                    −
                  </button>
                  <span className="text-2xl font-black text-green-700 w-8 text-center">{qty}</span>
                </>
              )}
              <button
                onClick={() => onSetQty(produto.cod, qty + 1)}
                disabled={disponivel !== Infinity && qty >= disponivel}
                className={`w-14 h-14 rounded-full font-black text-3xl flex items-center justify-center transition-colors
                  ${qty > 0
                    ? 'bg-green-600 text-white active:bg-green-700'
                    : 'bg-green-100 text-green-700 active:bg-green-200'}
                  disabled:opacity-30`}>
                +
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── TELA CATÁLOGO ─────────────────────────────────────────────────────────────
function TelaCatalogo({ config, produtos, carrinho, onSetQty, total, totalItens, getDisponivel, pedidoExistente, onVerCarrinho, showInstall, iosInstall, install, dismiss }) {
  const cats = [...new Set([...CATS_ORDEM, ...produtos.map(p => p.categoria)])]

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Header config={config} />

      {/* Banner instalação PWA */}
      {(showInstall === true || showInstall === 'manual') && (
        <div className="mx-4 mt-3 rounded-2xl shadow-lg overflow-hidden">
          {showInstall === true && !iosInstall && (
            <div className="bg-green-700 text-white p-3 flex items-center gap-3">
              <img src="/logo-korin.png" alt="" className="w-10 h-10 rounded-xl flex-shrink-0 bg-white p-1" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black">Instale o Clube Korin</div>
                <button onClick={install} className="text-xs bg-white text-green-700 font-black px-3 py-1.5 rounded-full mt-1.5 block active:bg-green-100">📲 Instalar agora</button>
              </div>
              <button onClick={dismiss} className="text-green-300 text-2xl">✕</button>
            </div>
          )}
          {(showInstall === 'manual' || iosInstall) && (
            <div className="bg-white border-2 border-green-600 p-4">
              <div className="text-sm font-black text-green-800 mb-2">📲 Instalar o Clube Korin</div>
              {iosInstall ? (
                <div className="text-sm text-stone-600">Toque em <strong>Compartilhar ↑</strong> → <strong>"Adicionar à tela de início"</strong></div>
              ) : (
                <div className="text-sm text-stone-600 space-y-1">
                  <div>1. Toque nos <strong>⋮ três pontinhos</strong> do Chrome</div>
                  <div>2. Toque em <strong>"Adicionar à tela inicial"</strong></div>
                  <div>3. Confirme tocando em <strong>"Adicionar"</strong></div>
                </div>
              )}
              <button onClick={dismiss} className="mt-2 text-xs text-stone-400 underline">Fechar</button>
            </div>
          )}
        </div>
      )}

      {pedidoExistente && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
          <span className="text-amber-700 font-bold text-base">
            ✏️ Editando seu pedido de {config.periodo}
          </span>
        </div>
      )}

      <main className="flex-1 px-4 py-4 pb-32">
        <div className="text-sm text-stone-400 font-semibold uppercase tracking-widest mb-4 text-center">
          Escolha seus produtos
        </div>

        {cats.map(cat => {
          const lista = produtos
            .filter(p => p.categoria === cat)
            .filter(p => {
              const { disponivel } = getDisponivel(p.cod)
              const qty = carrinho[p.cod] || 0
              // Ocultar produto se esgotado E não tem nada no carrinho
              return !(disponivel === 0 && qty === 0)
            })
            .sort((a, b) => a.cod - b.cod)
          if (!lista.length) return null
          return (
            <div key={cat} className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: CAT_COR[cat] || '#888' }} />
                <span className="text-sm font-black uppercase tracking-widest" style={{ color: CAT_COR[cat] || '#555' }}>
                  {cat}
                </span>
              </div>
              {lista.map(produto => {
                const { disponivel, qtdCaixa } = getDisponivel(produto.cod)
                return (
                  <ProdutoCard
                    key={produto.id}
                    produto={produto}
                    qty={carrinho[produto.cod] || 0}
                    onSetQty={onSetQty}
                    disponivel={disponivel}
                    qtdCaixa={qtdCaixa}
                  />
                )
              })}
            </div>
          )
        })}
      </main>

      {/* Barra carrinho flutuante */}
      {totalItens > 0 && (
        <div className="fixed bottom-0 left-0 w-full z-30 px-4 pb-4">
          <button onClick={onVerCarrinho}
            className="w-full bg-green-700 text-white rounded-2xl py-5 flex items-center justify-between px-6 shadow-2xl active:bg-green-800">
            <div className="flex items-center gap-3">
              <div className="bg-white text-green-700 font-black text-base w-8 h-8 rounded-full flex items-center justify-center">
                {totalItens}
              </div>
              <span className="text-lg font-black">Ver carrinho</span>
            </div>
            <span className="text-xl font-black">{fmt(total)}</span>
          </button>
        </div>
      )}

      <Rodape />
    </div>
  )
}

// ── TELA CARRINHO ─────────────────────────────────────────────────────────────
function TelaCarrinho({ carrinho, produtos, total, onVoltar, onAvancar, onSetQty }) {
  const itens = Object.entries(carrinho)
    .filter(([, q]) => q > 0)
    .map(([cod, qty]) => ({ produto: produtos.find(p => p.cod === parseInt(cod)), qty }))
    .filter(i => i.produto)
    .sort((a, b) => a.produto.cod - b.produto.cod)

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-green-800 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
        <button onClick={onVoltar} className="text-3xl active:opacity-60">←</button>
        <div>
          <div className="text-xs text-green-300 uppercase tracking-widest">Etapa 2 de 5</div>
          <div className="text-xl font-black">Revisar pedido</div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-36">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-50">
          {itens.map(({ produto, qty }) => (
            <div key={produto.cod} className="flex items-center px-4 py-4 gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                style={{ background: CAT_COR[produto.categoria] || '#888' }}>
                {produto.cod}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-stone-800 leading-tight">{produto.nome}</div>
                <div className="text-base text-stone-400">{produto.unidade}</div>
                <div className="text-base font-black text-green-700 mt-0.5">{fmt(produto.preco * qty)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => onSetQty(produto.cod, qty - 1)}
                  className="w-12 h-12 rounded-full bg-stone-100 text-stone-600 font-black text-2xl flex items-center justify-center active:bg-stone-200">
                  −
                </button>
                <span className="text-xl font-black text-green-700 w-7 text-center">{qty}</span>
                <button onClick={() => onSetQty(produto.cod, qty + 1)}
                  className="w-12 h-12 rounded-full bg-green-600 text-white font-black text-2xl flex items-center justify-center active:bg-green-700">
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-green-800 text-white rounded-2xl p-5 mt-4 flex justify-between items-center">
          <span className="text-xl font-black">TOTAL</span>
          <span className="text-4xl font-black">{fmt(total)}</span>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-stone-100 px-4 py-4 flex gap-3">
        <button onClick={onVoltar}
          className="px-6 py-4 bg-stone-100 text-stone-600 rounded-2xl font-black text-lg active:bg-stone-200">
          ← Voltar
        </button>
        <button onClick={onAvancar}
          className="flex-1 py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800">
          Continuar →
        </button>
      </div>
    </div>
  )
}

// ── TELA DADOS ────────────────────────────────────────────────────────────────
function TelaDados({ clienteDados, setClienteDados, onVoltar, onAvancar }) {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-green-800 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
        <button onClick={onVoltar} className="text-3xl active:opacity-60">←</button>
        <div>
          <div className="text-xs text-green-300 uppercase tracking-widest">Etapa 3 de 5</div>
          <div className="text-xl font-black">Seus dados</div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-36 space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-base font-black text-stone-600 uppercase tracking-widest mb-2">
            Nome completo *
          </label>
          <input
            value={clienteDados.nome}
            onChange={e => setClienteDados(prev => ({ ...prev, nome: e.target.value }))}
            placeholder="Seu nome completo"
            autoComplete="name"
            className="w-full border-2 border-stone-200 rounded-2xl px-4 py-4 text-xl font-semibold focus:outline-none focus:border-green-500 bg-white"
          />
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-base font-black text-stone-600 uppercase tracking-widest mb-2">
            WhatsApp *
          </label>
          <input
            value={clienteDados.telefone}
            onChange={e => setClienteDados(prev => ({ ...prev, telefone: e.target.value }))}
            placeholder="(13) 99999-9999"
            type="tel"
            autoComplete="tel"
            className="w-full border-2 border-stone-200 rounded-2xl px-4 py-4 text-xl font-semibold focus:outline-none focus:border-green-500 bg-white"
          />
        </div>

        {/* Unidade */}
        <div>
          <label className="block text-base font-black text-stone-600 uppercase tracking-widest mb-2">
            Local de retirada
          </label>
          <div className="space-y-2">
            {UNIDADES.map(u => (
              <button key={u} onClick={() => setClienteDados(prev => ({ ...prev, unidade: u }))}
                className={`w-full text-left px-5 py-4 rounded-2xl text-xl font-bold border-2 transition-colors ${clienteDados.unidade === u ? 'bg-green-700 text-white border-green-700' : 'bg-white text-stone-700 border-stone-200 active:bg-stone-50'}`}>
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Retirada info */}
        <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 text-center">
          <div className="text-base font-bold text-green-700">🏪 Retirada presencial</div>
          <div className="text-sm text-green-600 mt-0.5">A Valéria avisará quando o pedido estiver pronto</div>
        </div>

      </main>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-stone-100 px-4 py-4 flex gap-3">
        <button onClick={onVoltar}
          className="px-6 py-4 bg-stone-100 text-stone-600 rounded-2xl font-black text-lg active:bg-stone-200">
          ← Voltar
        </button>
        <button onClick={onAvancar}
          className="flex-1 py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800">
          Continuar →
        </button>
      </div>
    </div>
  )
}


// ── TELA PAGAMENTO ────────────────────────────────────────────────────────────
function TelaPagamento({ clienteDados, setClienteDados, onVoltar, onConfirmar, salvando, erro, total }) {
  const opcoes = [
    { id: 'PIX',           label: '📱 PIX',      desc: 'Chave PIX' },
    { id: 'Dinheiro',      label: '💵 Dinheiro', desc: 'Dinheiro na entrega' },
    { id: 'Cartão Crédito',label: '💳 Crédito',  desc: 'Cartão de crédito' },
    { id: 'Cartão Débito', label: '💳 Débito',   desc: 'Cartão de débito' },
  ]
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-green-800 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
        <button onClick={onVoltar} className="text-3xl active:opacity-60">←</button>
        <div>
          <div className="text-xs text-green-300 uppercase tracking-widest">Etapa 4 de 5</div>
          <div className="text-xl font-black">Como vai pagar?</div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 pb-36 space-y-3">
        {opcoes.map(op => (
          <button key={op.id}
            onClick={() => setClienteDados(prev => ({ ...prev, pagamento: op.id }))}
            className={`w-full py-6 px-6 rounded-2xl border-2 flex items-center gap-4 transition-colors text-left
              ${clienteDados.pagamento === op.id
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white text-stone-700 border-stone-200 active:bg-stone-50'}`}>
            <span className="text-3xl">{op.label.split(' ')[0]}</span>
            <div>
              <div className="text-xl font-black">{op.label.split(' ').slice(1).join(' ')}</div>
              <div className={`text-sm ${clienteDados.pagamento === op.id ? 'text-green-200' : 'text-stone-400'}`}>{op.desc}</div>
            </div>
            {clienteDados.pagamento === op.id && (
              <span className="ml-auto text-2xl">✅</span>
            )}
          </button>
        ))}

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center text-lg text-red-700 font-bold">
            {erro}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-stone-100 px-4 py-4 flex gap-3">
        <button onClick={onVoltar}
          className="px-6 py-4 bg-stone-100 text-stone-600 rounded-2xl font-black text-lg active:bg-stone-200">
          ← Voltar
        </button>
        <button onClick={onConfirmar} disabled={salvando || !clienteDados.pagamento}
          className="flex-1 py-4 bg-green-700 text-white rounded-2xl font-black text-lg active:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2">
          {salvando ? <><span className="animate-spin">⟳</span> Salvando…</> : `✅ Confirmar — ${fmt(total)}`}
        </button>
      </div>
    </div>
  )
}

// ── TELA CONFIRMAÇÃO ──────────────────────────────────────────────────────────
function TelaConfirmacao({ pedido, config, isEdicao, onEditar }) {
  const fechado = isPeriodoFechado(config)
  const total = pedido.itens.reduce((s, it) => s + (it.preco * it.qty), 0)

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Header config={config} />

      <main className="flex-1 px-4 py-6 pb-8">
        {/* Status */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">✅</div>
          <div className="text-3xl font-black text-green-700">
            {isEdicao ? 'Pedido atualizado!' : 'Pedido confirmado!'}
          </div>
          <div className="text-base text-stone-400 mt-1">{config?.periodo}</div>
        </div>

        {/* Dados */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 mb-4 space-y-2">
          <div className="flex justify-between text-lg">
            <span className="text-stone-500 font-semibold">Nome</span>
            <span className="font-black text-stone-800">{pedido.nome}</span>
          </div>
          {pedido.telefone && (
            <div className="flex justify-between text-lg">
              <span className="text-stone-500 font-semibold">WhatsApp</span>
              <span className="font-bold text-stone-700">{pedido.telefone}</span>
            </div>
          )}
          <div className="flex justify-between text-lg">
            <span className="text-stone-500 font-semibold">Retirada</span>
            <span className="font-bold text-stone-700">{pedido.unidade}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="text-stone-500 font-semibold">Pagamento</span>
            <span className="font-bold text-stone-700">{pedido.pagamento}</span>
          </div>
        </div>

        {/* Itens */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-50 mb-4">
          {pedido.itens.sort((a, b) => a.cod - b.cod).map(it => (
            <div key={it.cod} className="flex justify-between items-center px-4 py-3.5">
              <div>
                <div className="text-xl font-bold text-stone-800">
                  <span className="text-sm bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-black mr-2">{it.cod}</span>
                  {it.qty}× {it.nome}
                </div>
                <div className="text-sm text-stone-400">{it.unidade}</div>
              </div>
              <div className="text-xl font-black text-green-700">{fmt(it.preco * it.qty)}</div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="bg-green-800 text-white rounded-2xl p-5 flex justify-between items-center mb-6">
          <span className="text-xl font-black">TOTAL</span>
          <span className="text-4xl font-black">{fmt(total)}</span>
        </div>

        {/* Info */}
        <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-4 text-center mb-4">
          <div className="text-base font-bold text-green-700">
            A Valéria avisará quando estiver pronto para retirada! 🌿
          </div>
        </div>

        {/* Botão editar */}
        {!fechado && (
          <button onClick={onEditar}
            className="w-full py-4 border-2 border-green-600 text-green-700 rounded-2xl font-black text-lg active:bg-green-50">
            ✏️ Alterar pedido
          </button>
        )}
      </main>

      <Rodape />
    </div>
  )
}

// ── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function CatalogoApp() {
  const [tela, setTela]                     = useState('loading')  // loading|fechado|catalogo|carrinho|dados|pagamento|confirmacao
  const [config, setConfig]                 = useState(null)
  const [produtos, setProdutos]             = useState([])
  const [pedidosWeb, setPedidosWeb]         = useState([])
  const [carrinho, setCarrinho]             = useState({})    // { [cod]: qty }
  const [clienteDados, setClienteDados]     = useState({ nome: '', telefone: '', unidade: UNIDADES[0], pagamento: '' })
  const [pedidoExistente, setPedidoExistente] = useState(null)
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null)
  const [isEdicao, setIsEdicao]             = useState(false)
  const [salvando, setSalvando]             = useState(false)
  const [erro, setErro]                     = useState('')

  const { show: showInstall, isIOS: iosInstall, install, dismiss } = useInstallPrompt('catalogo')

  const total = Object.entries(carrinho).reduce((s, [cod, qty]) => {
    const p = produtos.find(x => x.cod === parseInt(cod))
    return s + (p ? p.preco * qty : 0)
  }, 0)
  const totalItens = Object.values(carrinho).reduce((s, q) => s + q, 0)

  // ── INIT ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const cfg = await loadConfigWeb()
      setConfig(cfg)

      const prods = await getProdutosWeb()
      setProdutos(prods.length ? prods : PRODUTOS_INICIAIS)

      const pedidos = await getPedidosWeb(cfg.periodo)
      setPedidosWeb(pedidos)

      const dadosSalvos = loadClienteDados()
      if (dadosSalvos?.telefone) {
        setClienteDados(prev => ({ ...prev, ...dadosSalvos }))
        if (!isPeriodoFechado(cfg)) {
          const pedExistente = await getPedidoByTelefone(dadosSalvos.telefone, cfg.periodo)
          if (pedExistente && pedExistente.status !== 'cancelado') {
            setPedidoExistente(pedExistente)
            const cart = {}
            pedExistente.itens.forEach(it => { cart[it.cod] = it.qty })
            setCarrinho(cart)
            // Show existing order confirmation
            setPedidoConfirmado(pedExistente)
            setTela('confirmacao')
            return
          }
        }
      }

      setTela('catalogo')
    }
    init()
  }, [])

  // ── AUTO-REFRESH DISPONIBILIDADE ──────────────────────────────────────────
  useEffect(() => {
    const refresh = async () => {
      if (!navigator.onLine || tela !== 'catalogo') return
      try {
        const cfg = await loadConfigWeb()
        setConfig(cfg)
        const peds = await getPedidosWeb(cfg.periodo)
        setPedidosWeb(peds)
      } catch {}
    }
    const onFocus = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onFocus)
    const interval = setInterval(refresh, 60000)
    return () => { document.removeEventListener('visibilitychange', onFocus); clearInterval(interval) }
  }, [tela])

  // ── LÓGICA DE DISPONIBILIDADE ──────────────────────────────────────────────
  const totaisPorProduto = getTotaisPorProduto(pedidosWeb)

  const getDisponivel = useCallback((cod) => {
    const cfgProd = config?.produtos?.[String(cod)]
    const qtdCaixa = cfgProd?.qtdCaixa || 0
    if (!qtdCaixa || !cfgProd?.caixasAbertas) return { disponivel: Infinity, qtdCaixa: 0 }

    const totalSlots    = cfgProd.caixasAbertas * qtdCaixa
    const jaDeOutros    = (totaisPorProduto[cod] || 0) - (pedidoExistente?.itens.find(i => i.cod === cod)?.qty || 0)
    const disponivel    = Math.max(0, totalSlots - jaDeOutros)
    return { disponivel, qtdCaixa }
  }, [config, totaisPorProduto, pedidoExistente])

  const handleSetQty = (cod, qty) => {
    const { disponivel } = getDisponivel(cod)
    const final = Math.min(Math.max(0, qty), disponivel)
    setCarrinho(prev => {
      const n = { ...prev }
      if (final === 0) delete n[cod]; else n[cod] = final
      return n
    })
  }

  // ── CONFIRMAR PEDIDO ────────────────────────────────────────────────────────
  const handleConfirmar = async () => {
    if (!clienteDados.nome.trim()) { setErro('Informe seu nome completo'); setTela('dados'); return }
    if (!clienteDados.telefone.trim()) { setErro('Informe seu telefone/WhatsApp'); setTela('dados'); return }
    if (!clienteDados.pagamento) { setErro('Selecione a forma de pagamento'); return }
    if (Object.keys(carrinho).length === 0) { setErro('Adicione pelo menos um produto'); return }

    setSalvando(true); setErro('')
    saveClienteDados(clienteDados)

    const itens = Object.entries(carrinho)
      .filter(([, q]) => q > 0)
      .map(([cod, qty]) => {
        const p = produtos.find(x => x.cod === parseInt(cod))
        return { cod: parseInt(cod), nome: p.nome, unidade: p.unidade, preco: p.preco, qty }
      })
      .sort((a, b) => a.cod - b.cod)

    const pedido = {
      ...(pedidoExistente ? { id: pedidoExistente.id } : {}),
      periodo:   config.periodo,
      nome:      clienteDados.nome.trim(),
      telefone:  clienteDados.telefone.trim(),
      unidade:   clienteDados.unidade,
      itens,
      pagamento: clienteDados.pagamento,
      total:     parseFloat(total.toFixed(2)),
      status:    'pendente',
    }

    const result = await savePedidoWeb(pedido)
    setSalvando(false)

    if (result.ok) {
      const edicao = !!pedidoExistente
      setPedidoExistente(result.data || pedido)
      setPedidoConfirmado(result.data || pedido)
      setIsEdicao(edicao)
      setTela('confirmacao')
    } else {
      setErro(`Erro ao salvar: ${result.error}. Verifique sua conexão.`)
    }
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  if (tela === 'loading') return (
    <div className="flex items-center justify-center min-h-screen bg-green-50">
      <div className="text-green-800 text-2xl font-black animate-pulse">Carregando… 🌿</div>
    </div>
  )

  if (isPeriodoFechado(config)) return <TelaFechada config={config} showInstall={showInstall} iosInstall={iosInstall} install={install} dismiss={dismiss} />

  if (tela === 'confirmacao' && pedidoConfirmado) return (
    <TelaConfirmacao
      pedido={pedidoConfirmado}
      config={config}
      isEdicao={isEdicao}
      onEditar={() => { setIsEdicao(false); setTela('catalogo') }}
    />
  )

  if (tela === 'pagamento') return (
    <TelaPagamento
      clienteDados={clienteDados}
      setClienteDados={setClienteDados}
      onVoltar={() => setTela('dados')}
      onConfirmar={handleConfirmar}
      salvando={salvando}
      erro={erro}
      total={total}
    />)

  if (tela === 'dados') return (
    <TelaDados
      clienteDados={clienteDados}
      setClienteDados={setClienteDados}
      onVoltar={() => setTela('carrinho')}
      onAvancar={() => { setErro(''); setTela('pagamento') }}
    />
  )

  if (tela === 'carrinho') return (
    <TelaCarrinho
      carrinho={carrinho}
      produtos={produtos}
      total={total}
      onVoltar={() => setTela('catalogo')}
      onAvancar={() => { setErro(''); setTela('dados') }}
      onSetQty={handleSetQty}
    />
  )

  return (
    <TelaCatalogo
      config={config}
      produtos={produtos}
      carrinho={carrinho}
      onSetQty={handleSetQty}
      total={total}
      totalItens={totalItens}
      getDisponivel={getDisponivel}
      pedidoExistente={pedidoExistente}
      onVerCarrinho={() => setTela('carrinho')}
      showInstall={showInstall}
      iosInstall={iosInstall}
      install={install}
      dismiss={dismiss}
    />
  )
}
