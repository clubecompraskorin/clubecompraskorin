import { useEffect, useState } from 'react'
import SiteFooter from './lib/SiteFooter'

const display = { fontFamily: "'Space Grotesk', sans-serif" }
const mono = { fontFamily: "'JetBrains Mono', monospace" }

const PASSOS = [
  { n: '01', titulo: 'Catálogo', texto: 'A Dedicante fotografa a tabela de preços da Korin. O sistema lê os produtos e organiza o período sozinho.' },
  { n: '02', titulo: 'Pedidos',  texto: 'Cada membro pede pelo link do catálogo, ou manda a lista pelo grupo mesmo — você só cola a mensagem e a IA organiza.' },
  { n: '03', titulo: 'Entrega', texto: 'Cada unidade separa e confirma a entrega pelo próprio link, com PIN — você acompanha tudo em tempo real, sem conferir nome por nome.' },
  { n: '04', titulo: 'Fechamento', texto: 'O sistema soma tudo e mostra exatamente quantas caixas comprar. Sem sobra, sem planilha, sem improviso.' },
]

const FAQ_HOME = [
  { p: 'Precisa baixar algum aplicativo?', r: 'Não. Funciona direto no navegador, tanto pra você quanto pros seus membros. Quem quiser, pode "instalar" na tela inicial pra abrir mais rápido, mas isso é opcional.' },
  { p: 'Funciona sem internet?', r: 'Pra ver o catálogo e fazer pedidos, precisa de internet — os dados são atualizados em tempo real entre você, seus membros e a Korin.' },
  { p: 'Precisa ter CNPJ?', r: 'Não necessariamente. O cadastro aceita CPF ou CNPJ, o que você tiver.' },
  { p: 'Dá pra imprimir os pedidos?', r: 'Sim. Imprime todos os pendentes de uma vez, agrupados numa folha só, e ainda dá pra filtrar por unidade antes de imprimir.' },
  { p: 'Tem como enviar a compra pronta pra Korin?', r: 'Sim. O sistema gera uma planilha com tudo calculado — quanto comprar em caixa fechada, custo e venda — por unidade ou tudo junto.' },
  { p: 'O membro pode comprar online?', r: 'Sim. Cada membro recebe um link e monta o pedido direto no catálogo, sem precisar de conta nem instalar nada.' },
  { p: 'Cuido de mais de uma unidade — dá pra usar pra todas?', r: 'Sim. Você cadastra quantas unidades precisar numa mesma conta, e os pedidos, a entrega e a planilha já vêm organizados separadamente por unidade.' },
  { p: 'Funciona no iPhone e no Android?', r: 'Sim. É um site, então funciona em qualquer celular com navegador — não depende de loja de aplicativo.' },
  { p: 'Tem como o representante de uma unidade entregar sem eu conferir tudo?', r: 'Sim. Cada unidade ganha um link próprio com PIN — o representante vê os pedidos daquela unidade, separa e confirma a entrega direto por ali, sem precisar de login completo.' },
  { p: 'Dá pra confirmar o que realmente foi comprado da Korin?', r: 'Sim. Você reimporta a mesma planilha que enviou pra Korin, já preenchida, e o sistema usa a quantidade real em vez da estimativa — inclusive pra calcular a sobra do período seguinte.' },
]

export default function Home() {
  const [pronto, setPronto] = useState(false)
  useEffect(() => { const t = setTimeout(() => setPronto(true), 50); return () => clearTimeout(t) }, [])

  return (
    <div className="bg-[#F6F2EA] text-[#14241B] min-h-screen">
      {/* NAV */}
      <nav className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <img src="/logo-korin.png" alt="Clube de Compras Korin" className="h-11 md:h-12 w-auto" />
        <a href="/painel" className="text-sm font-semibold text-[#1A5C38] hover:text-[#0F3D24] transition-colors">
          Entrar / Criar conta →
        </a>
      </nav>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-10 pb-20 md:pt-16 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
        <div className={`transition-all duration-700 ${pronto ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <h1 className="text-[2.4rem] md:text-[3.1rem] leading-[1.08] font-semibold tracking-tight" style={display}>
            Coordenar o pedido coletivo da Korin, sem planilha e sem digitar pedido um por um.
          </h1>
          <p className="mt-5 text-[1.05rem] text-[#14241B]/70 leading-relaxed max-w-md">
            Catálogo, pedidos, embalagens e fechamento de compra do seu clube — organizados automaticamente, num só lugar.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/painel" className="px-6 py-3.5 rounded-xl bg-[#1A5C38] text-white font-semibold text-sm hover:bg-[#0F3D24] transition-colors">
              Sou Dedicante →
            </a>
            <a href="/ajuda" className="px-6 py-3.5 rounded-xl border border-[#1A5C38]/25 text-[#1A5C38] font-semibold text-sm hover:bg-[#1A5C38]/5 transition-colors">
              Como funciona
            </a>
          </div>
        </div>
        <div className={`flex justify-center md:justify-end transition-all duration-700 delay-150 ${pronto ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <div className="relative">
            <div className="absolute -inset-4 bg-[#1A5C38]/10 rounded-[28px] rotate-2" />
            <div className="relative bg-[#14241B] rounded-[28px] p-2.5 shadow-2xl shadow-[#0F3D24]/25 -rotate-1 w-[260px]">
              <img src="/screenshot-resumo.jpg" alt="Tela de fechamento do Clube de Compras Korin mostrando quantas caixas comprar da Korin, sem sobra"
                className="rounded-[20px] w-full h-auto block" />
            </div>
          </div>
        </div>
      </section>

      {/* DESTAQUE: FOTO + IA */}
      <section className="max-w-5xl mx-auto px-6 py-4 pb-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Sem digitar nada</div>
            <h2 className="text-2xl md:text-3xl font-semibold leading-snug" style={display}>
              Tira uma foto ou sobe a planilha da Korin. O catálogo se monta sozinho.
            </h2>
            <p className="mt-4 text-[#14241B]/70 leading-relaxed">
              Você manda a tabela de preços que a Korin manda todo mês — foto ou a planilha oficial mesmo. O sistema
              lê os produtos, organiza por categoria e identifica se é o mesmo mês ou um período novo, sem você
              digitar um número. E na hora de comprar, é a mesma planilha que volta pronta — com a quantidade certa
              em caixa fechada, sem você recontar nada.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="relative">
              <div className="absolute -inset-3 bg-[#1A5C38]/10 rounded-[32px] -rotate-2" />
              <div className="relative bg-[#14241B] rounded-[28px] p-2.5 shadow-2xl shadow-[#0F3D24]/25 rotate-1 w-[230px]">
                <img src="/screenshot-embalagens.jpg" alt="Catálogo importado automaticamente no Clube de Compras Korin"
                  className="rounded-[20px] w-full h-auto block" />
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
            somar tudo na mão pra saber quantas caixas comprar, e separar o total de cada membro numa planilha.
            O Clube de Compras Korin faz esse trabalho automaticamente — cada Dedicante com seu próprio catálogo,
            cada membro pedindo direto por um link.
          </p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-10 text-center">Como funciona</div>
        <div className="grid md:grid-cols-4 gap-8">
          {PASSOS.map(p => (
            <div key={p.n}>
              <div className="text-sm font-medium text-[#1A5C38]/50 mb-2" style={mono}>{p.n}</div>
              <div className="font-semibold text-lg mb-2" style={display}>{p.titulo}</div>
              <p className="text-[#14241B]/65 text-[0.95rem] leading-relaxed">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GESTÃO COMPLETA — destaque IA WhatsApp + grid de operação */}
      <section className="bg-white border-y border-[#14241B]/5">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Não é só link bonito</div>
              <h2 className="text-2xl md:text-3xl font-semibold leading-snug" style={display}>
                O pedido chega de qualquer jeito. A IA organiza.
              </h2>
              <p className="mt-4 text-[#14241B]/70 leading-relaxed">
                Tem membro que nunca vai clicar em link nenhum — só manda mensagem mesmo. Cole o texto do WhatsApp
                dele e a IA identifica produto, quantidade e código, e organiza junto com todos os outros pedidos do período.
              </p>
            </div>
            <div className="flex justify-center md:justify-end">
              <div className="relative">
                <div className="absolute -inset-3 bg-[#1A5C38]/10 rounded-[32px] -rotate-2" />
                <div className="relative bg-[#14241B] rounded-[28px] p-2.5 shadow-2xl shadow-[#0F3D24]/25 rotate-1 w-[230px]">
                  <img src="/screenshot-whatsapp-ia.jpg" alt="Interpretação de pedido do WhatsApp por IA"
                    className="rounded-[20px] w-full h-auto block" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              { i: '💰', t: 'Custo e venda, lado a lado', d: 'Cada unidade tem seus pedidos separados, e você vê o preço de custo e o de venda juntos — sabe a margem antes de fechar a compra com a Korin.' },
              { i: '🚚', t: 'Entrega sem perder tempo', d: 'Os pedidos já chegam agrupados por unidade. Na hora de entregar, é só imprimir — vários pedidos numa folha só, sem desperdiçar papel.' },
              { i: '📊', t: 'Planilha pronta pra Korin', d: 'Quantidade pedida, quanto comprar em caixa fechada, custo total e venda total — por unidade ou tudo junto. Sem montar nada na mão.' },
            ].map(c => (
              <div key={c.t}>
                <div className="text-2xl mb-3">{c.i}</div>
                <div className="font-semibold mb-1.5">{c.t}</div>
                <p className="text-sm text-[#14241B]/65 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ENTREGA POR UNIDADE / REPRESENTANTE */}
      <section className="max-w-5xl mx-auto px-6 py-4 pb-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Separação por unidade</div>
            <h2 className="text-2xl md:text-3xl font-semibold leading-snug" style={display}>
              Tem representante numa unidade? Ele entrega sem você conferir nome por nome.
            </h2>
            <p className="mt-4 text-[#14241B]/70 leading-relaxed">
              Cada unidade ganha um link só dela, com PIN — sem precisar de login completo. O representante abre,
              vê exatamente quem pediu o quê ali, separa e confirma a entrega direto por ali, e você acompanha tudo
              em tempo real no seu painel.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="relative">
              <div className="absolute -inset-3 bg-[#1A5C38]/10 rounded-[32px] rotate-2" />
              <div className="relative bg-[#14241B] rounded-[28px] p-2.5 shadow-2xl shadow-[#0F3D24]/25 rotate-1 w-[230px]">
                <img src="/screenshot-entrega.jpg" alt="Lista de entrega separada por unidade, com pedidos pendentes e entregues"
                  className="rounded-[20px] w-full h-auto block" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRO CLIENTE FINAL */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-[#1A5C38]/5 border border-[#1A5C38]/15 rounded-[28px] px-8 py-10 md:px-12 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Pro seu membro</div>
            <h2 className="text-xl md:text-2xl font-semibold mb-3" style={display}>Quem pede também sente a diferença</h2>
            <p className="text-[#14241B]/70 leading-relaxed mb-6">
              E você não fica presa passando pedido pro sistema um por um — cada membro que usa o link já cai
              pronto, sem passar pela sua mão.
            </p>
            <div className="space-y-5">
              {[
                { i: '🔗', t: 'Pede pelo link', d: 'Sem instalar nada — abre direto no navegador do celular.' },
                { i: '📍', t: 'Escolhe a unidade', d: 'Indica onde vai retirar, e o pedido já cai separado por local.' },
                { i: '💬', t: 'Não importa de onde vem', d: 'Pediu pelo link ou mandou a lista no grupo do WhatsApp mesmo? Os dois caem juntos, sem digitar nada na mão.' },
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
                <img src="/screenshot-catalogo.jpg" alt="Catálogo de pedidos visto pelo membro"
                  className="rounded-[20px] w-full h-auto block" />
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
              <div className="text-xs text-[#14241B]/55">Dedicante · Lattuga Orgânicos</div>
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
