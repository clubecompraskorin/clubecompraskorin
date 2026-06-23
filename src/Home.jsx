import { useEffect, useState } from 'react'
import SiteFooter from './lib/SiteFooter'

const display = { fontFamily: "'Space Grotesk', sans-serif" }
const mono = { fontFamily: "'JetBrains Mono', monospace" }

function ManifestCard() {
  const linhas = [
    { cod: '01', nome: 'Coxa s/transgênico', cx: 17 },
    { cod: '02', nome: 'Alface crespa',      cx: 4 },
    { cod: '03', nome: 'Tomate italiano',    cx: 6 },
  ]
  return (
    <div className="relative select-none">
      <div className="absolute -inset-4 bg-[#1A5C38]/10 rounded-[28px] rotate-2" />
      <div
        className="relative bg-white rounded-[22px] shadow-2xl shadow-[#0F3D24]/20 px-6 py-6 w-full max-w-[340px] -rotate-1"
        style={mono}
      >
        <div className="text-[11px] text-stone-400 tracking-widest uppercase mb-1">Pedido Korin · Junho/2026</div>
        <div className="h-px bg-stone-100 mb-3" />
        {linhas.map(l => (
          <div key={l.cod} className="flex items-center justify-between text-[13px] py-1 text-stone-700">
            <span className="text-stone-400 mr-2">{l.cod}</span>
            <span className="flex-1 truncate">{l.nome}</span>
            <span className="font-medium text-stone-800">{l.cx} cx</span>
          </div>
        ))}
        <div className="h-px bg-stone-100 my-3" />
        <div className="flex items-center justify-between text-[13px] text-stone-500">
          <span>Pedidos confirmados</span><span className="font-semibold text-stone-800">47</span>
        </div>
        <div className="flex items-center justify-between text-[13px] text-stone-500 mt-1">
          <span>Caixas a comprar</span><span className="font-semibold text-stone-800">27</span>
        </div>
        <div className="flex items-center justify-between text-[13px] mt-1">
          <span className="text-[#1A5C38] font-semibold">Sobra</span>
          <span className="font-semibold text-[#1A5C38]">0</span>
        </div>
      </div>
    </div>
  )
}

const PASSOS = [
  { n: '01', titulo: 'Catálogo', texto: 'A coordenadora fotografa a tabela de preços da Korin. O sistema lê os produtos e organiza o período sozinho.' },
  { n: '02', titulo: 'Pedidos',  texto: 'Cada cliente pede pelo link do catálogo — sem instalar nada, sem grupo de WhatsApp pra anotar.' },
  { n: '03', titulo: 'Fechamento', texto: 'O sistema soma tudo e mostra exatamente quantas caixas comprar. Sem sobra, sem planilha, sem improviso.' },
]

export default function Home() {
  const [pronto, setPronto] = useState(false)
  useEffect(() => { const t = setTimeout(() => setPronto(true), 50); return () => clearTimeout(t) }, [])

  return (
    <div className="bg-[#F6F2EA] text-[#14241B] min-h-screen">
      {/* NAV */}
      <nav className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo-korin.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="font-semibold text-sm" style={display}>Clube de Compras Korin</span>
        </div>
        <a href="/painel" className="text-sm font-semibold text-[#1A5C38] hover:text-[#0F3D24] transition-colors">
          Entrar →
        </a>
      </nav>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-10 pb-20 md:pt-16 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
        <div className={`transition-all duration-700 ${pronto ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <h1 className="text-[2.4rem] md:text-[3.1rem] leading-[1.08] font-semibold tracking-tight" style={display}>
            Coordenar o pedido coletivo da Korin, sem planilha e sem grupo de zap.
          </h1>
          <p className="mt-5 text-[1.05rem] text-[#14241B]/70 leading-relaxed max-w-md">
            Catálogo, pedidos, embalagens e fechamento de compra do seu clube — organizados automaticamente, num só lugar.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/painel" className="px-6 py-3.5 rounded-xl bg-[#1A5C38] text-white font-semibold text-sm hover:bg-[#0F3D24] transition-colors">
              Sou coordenadora →
            </a>
            <a href="/ajuda" className="px-6 py-3.5 rounded-xl border border-[#1A5C38]/25 text-[#1A5C38] font-semibold text-sm hover:bg-[#1A5C38]/5 transition-colors">
              Como funciona
            </a>
          </div>
        </div>
        <div className={`flex justify-center md:justify-end transition-all duration-700 delay-150 ${pronto ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <ManifestCard />
        </div>
      </section>

      {/* POR QUE EXISTE */}
      <section className="bg-white border-y border-[#14241B]/5">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Por que existe</div>
          <p className="text-lg md:text-xl leading-relaxed text-[#14241B]/80">
            Hoje, organizar um pedido coletivo da Korin costuma significar anotar pedido por pedido no WhatsApp,
            somar tudo na mão pra saber quantas caixas comprar, e separar o total de cada cliente numa planilha.
            O Clube de Compras Korin faz esse trabalho automaticamente — cada coordenadora com seu próprio catálogo,
            cada cliente pedindo direto por um link.
          </p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-10 text-center">Como funciona</div>
        <div className="grid md:grid-cols-3 gap-8">
          {PASSOS.map(p => (
            <div key={p.n}>
              <div className="text-sm font-medium text-[#1A5C38]/50 mb-2" style={mono}>{p.n}</div>
              <div className="font-semibold text-lg mb-2" style={display}>{p.titulo}</div>
              <p className="text-[#14241B]/65 text-[0.95rem] leading-relaxed">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-[#1A5C38] text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold" style={display}>Pronta pra organizar o pedido do seu grupo?</h2>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="/painel" className="px-6 py-3.5 rounded-xl bg-white text-[#0F3D24] font-semibold text-sm hover:bg-white/90 transition-colors">
              Criar minha conta →
            </a>
            <a href="/ajuda" className="px-6 py-3.5 rounded-xl border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-colors">
              Ver passo a passo completo
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
