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

const FAQ_HOME = [
  { p: 'Os pedidos do mês anterior se perdem quando eu importo a tabela nova?', r: 'Não. Cada mês fica guardado separado — dá pra consultar qualquer período anterior depois de arquivado.' },
  { p: 'Precisa instalar algum aplicativo?', r: 'Não. Funciona direto no navegador, tanto pra você quanto pros seus clientes.' },
  { p: 'Posso ter mais de um local de retirada?', r: 'Sim, quantos precisar — e os pedidos já chegam organizados por unidade.' },
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
          Entrar / Criar conta →
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

      {/* DESTAQUE: FOTO + IA */}
      <section className="max-w-5xl mx-auto px-6 py-4 pb-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Sem digitar nada</div>
            <h2 className="text-2xl md:text-3xl font-semibold leading-snug" style={display}>
              Tira uma foto da tabela. A IA monta o catálogo sozinha.
            </h2>
            <p className="mt-4 text-[#14241B]/70 leading-relaxed">
              Você fotografa a tabela de preços que a Korin manda todo mês. O sistema lê os produtos, organiza por
              categoria e identifica se é o mesmo mês ou um período novo — sem você digitar um número.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="relative">
              <div className="absolute -inset-3 bg-[#1A5C38]/10 rounded-[32px] -rotate-2" />
              <div className="relative bg-[#14241B] rounded-[28px] p-2.5 shadow-2xl shadow-[#0F3D24]/25 rotate-1 w-[230px]">
                <img src="/screenshot-embalagens.jpg" alt="Catálogo importado automaticamente no Clube de Compras Korin"
                  className="rounded-[20px] w-full h-[400px] object-cover object-top" />
              </div>
            </div>
          </div>
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

      {/* PRO CLIENTE FINAL */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-[#1A5C38]/5 border border-[#1A5C38]/15 rounded-[28px] px-8 py-10 md:px-12 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Pro seu cliente</div>
            <h2 className="text-xl md:text-2xl font-semibold mb-6" style={display}>Quem pede também sente a diferença</h2>
            <div className="space-y-5">
              {[
                { i: '🔗', t: 'Pede pelo link', d: 'Sem instalar nada — abre direto no navegador do celular.' },
                { i: '📍', t: 'Escolhe a unidade', d: 'Indica onde vai retirar, e o pedido já cai separado por local.' },
                { i: '💬', t: 'Fim do grupo de zap', d: 'Não precisa mais anotar pedido em conversa nem confirmar na mão.' },
              ].map(b => (
                <div key={b.t} className="flex gap-3">
                  <div className="text-xl flex-shrink-0">{b.i}</div>
                  <div>
                    <div className="font-semibold mb-0.5">{b.t}</div>
                    <p className="text-sm text-[#14241B]/65 leading-relaxed">{b.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-3 bg-[#1A5C38]/10 rounded-[32px] rotate-2" />
              <div className="relative bg-[#14241B] rounded-[28px] p-2.5 shadow-2xl shadow-[#0F3D24]/25 -rotate-1 w-[230px]">
                <img src="/screenshot-catalogo.jpg" alt="Catálogo de pedidos visto pelo cliente final"
                  className="rounded-[20px] w-full h-[400px] object-cover object-top" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEPOIMENTO */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-8 text-center">Quem já usa</div>
        <div className="bg-white rounded-[28px] shadow-xl shadow-[#0F3D24]/10 px-8 py-10 md:px-12 md:py-12">
          <div className="text-4xl text-[#1A5C38]/25 leading-none mb-2" style={display}>“</div>
          <p className="text-lg md:text-xl leading-relaxed text-[#14241B]/85" style={display}>
            Eu passei mais de 4 anos controlando tudo no caderno, à mão. O que antes me tomava horas, hoje eu faço em
            minutos — e com muito mais acerto. E o que mudou mesmo foi na entrega: como o sistema já separa os
            pedidos por unidade, eu sei exatamente o que levar pra cada igreja, sem ficar conferindo nome por nome.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1A5C38]/10 flex items-center justify-center font-semibold text-[#1A5C38]" style={display}>V</div>
            <div>
              <div className="font-semibold text-sm">Valéria</div>
              <div className="text-xs text-[#14241B]/55">Coordenadora · Lattuga Orgânicos</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ RÁPIDO */}
      <section className="bg-white border-y border-[#14241B]/5">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-8 text-center">Perguntas rápidas</div>
          <div className="space-y-7">
            {FAQ_HOME.map(f => (
              <div key={f.p}>
                <div className="font-semibold text-[1.05rem]">{f.p}</div>
                <p className="mt-1.5 text-[#14241B]/65 leading-relaxed text-[0.95rem]">{f.r}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="/ajuda" className="text-sm font-semibold text-[#1A5C38] hover:text-[#0F3D24] transition-colors">
              Ver guia completo e mais perguntas →
            </a>
          </div>
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
