import { useEffect, useState } from 'react'
import SiteFooter from './lib/SiteFooter'

const display = { fontFamily: "'Space Grotesk', sans-serif" }
const mono = { fontFamily: "'JetBrains Mono', monospace" }

const PASSOS = [
  { n: '01', titulo: 'Catálogo', texto: 'Sobe a planilha oficial da Korin — a mesma que já usa pra comprar — ou tira uma foto da tabela. O sistema lê os produtos e organiza o período sozinho.' },
  { n: '02', titulo: 'Pedidos',  texto: 'Cada membro pede pelo link do catálogo, você digita manualmente, ou cola a mensagem do WhatsApp — a IA organiza.' },
  { n: '03', titulo: 'Entrega', texto: 'Entrega em 3 passos, ou passa o link com PIN pra outra pessoa entregar no seu lugar.' },
  { n: '04', titulo: 'Fechamento', texto: 'O sistema soma tudo e mostra exatamente quantas caixas comprar — e controla a sobra de cada produto pro período seguinte, sem planilha solta.' },
]

const FAQ_HOME = [
  { p: 'Precisa baixar algum aplicativo?', r: 'Não. Funciona direto no navegador, tanto pra você quanto pros seus membros. Quem quiser, pode "instalar" na tela inicial pra abrir mais rápido, mas isso é opcional.' },
  { p: 'Funciona sem internet?', r: 'Pra ver o catálogo e fazer pedidos, precisa de internet — os dados são atualizados em tempo real entre você, seus membros e a Korin.' },
  { p: 'Precisa ter CNPJ?', r: 'Não necessariamente. O cadastro aceita CPF ou CNPJ, o que você tiver.' },
  { p: 'Dá pra imprimir os pedidos?', r: 'Sim. Imprime todos os pendentes de uma vez, agrupados numa folha só, e ainda dá pra filtrar por unidade antes de imprimir.' },
  { p: 'Tem como enviar a compra pronta pra Korin?', r: 'Sim. O sistema gera uma planilha com tudo calculado — quanto comprar em caixa fechada, custo e venda — por unidade ou tudo junto.' },
  { p: 'O membro pode comprar online?', r: 'Sim. Cada membro recebe um link e monta o pedido direto no catálogo, sem precisar de conta nem instalar nada.' },
  { p: 'Cuido de mais de uma unidade — dá pra usar pra todas?', r: 'Sim. Você cadastra quantas unidades precisar numa mesma conta, e os pedidos, a entrega, o estoque e a planilha já vêm organizados separadamente por unidade.' },
  { p: 'Funciona no iPhone e no Android?', r: 'Sim. É um site, então funciona em qualquer celular com navegador — não depende de loja de aplicativo.' },
  { p: 'Tem como o representante de uma unidade entregar sem eu conferir tudo?', r: 'Sim. Cada unidade ganha um link próprio com PIN — o representante vê os pedidos daquela unidade, separa e confirma a entrega direto por ali, sem precisar de login completo.' },
  { p: 'Dá pra confirmar o que realmente foi comprado da Korin?', r: 'Sim. Você reimporta a mesma planilha que enviou pra Korin, já preenchida, e o sistema usa a quantidade real em vez da estimativa — inclusive pra calcular a sobra do período seguinte.' },
  { p: 'Dá pra vender direto numa feira ou culto, sem anotar em papel?', r: 'Sim. Tem um modo de venda rápida, separado do resto do sistema, pensado pra fila e pouco tempo por pessoa — você diz o que levou de estoque pra aquela unidade, vende tocando na tela, e cada venda já desconta e entra entregue na hora.' },
  { p: 'Preciso saber mexer em sistema pra começar?', r: 'Não. O guia de ajuda mostra cada passo com print de tela, do zero até o primeiro pedido recebido — dá pra seguir do começo ao fim sem perguntar nada pra ninguém.' },
]

function Hook({ eyebrow, titulo, corpo, img, alt, filhos, invertido = false }) {
  return (
    <section className="max-w-5xl mx-auto px-6 py-4 pb-16">
      <div className={`grid md:grid-cols-2 gap-10 items-center ${invertido ? 'md:[&>*:first-child]:order-2' : ''}`}>
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">{eyebrow}</div>
          <h2 className="text-2xl md:text-3xl font-semibold leading-snug" style={display}>{titulo}</h2>
          <p className="mt-4 text-[#14241B]/70 leading-relaxed">{corpo}</p>
          {filhos}
        </div>
        <div className="flex justify-center md:justify-end">
          <div className="relative">
            <div className="absolute -inset-3 bg-[#1A5C38]/10 rounded-[32px] -rotate-2" />
            <div className="relative bg-[#14241B] rounded-[28px] p-2.5 shadow-2xl shadow-[#0F3D24]/25 rotate-1 w-[230px]">
              <img src={img} alt={alt} className="rounded-[20px] w-full h-auto block" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const [pronto, setPronto] = useState(false)
  useEffect(() => { const t = setTimeout(() => setPronto(true), 50); return () => clearTimeout(t) }, [])

  return (
    <div className="bg-[#F6F2EA] text-[#14241B] min-h-screen">
      {/* NAV */}
      <nav className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <img src="/logo-clube-unido.png" alt="Clube Unido" className="h-11 md:h-12 w-auto" />
        <a href="/painel" className="text-sm font-semibold text-[#1A5C38] hover:text-[#0F3D24] transition-colors">
          Entrar / Criar conta →
        </a>
      </nav>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-10 pb-20 md:pt-16 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
        <div className={`transition-all duration-700 ${pronto ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Feito pra quem é Dedicante</div>
          <h1 className="text-[2.2rem] md:text-[2.9rem] leading-[1.1] font-semibold tracking-tight" style={display}>
            O sistema criado pra facilitar a gestão de quem coordena um Clube de Compras.
          </h1>
          <p className="mt-5 text-[1.05rem] text-[#14241B]/70 leading-relaxed max-w-md">
            Catálogo, pedidos, entrega, estoque e fechamento de compra — tudo organizado
            automaticamente, num só lugar, pensado pra quem não tem tempo sobrando nem paciência
            pra sistema complicado.
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
              <img src="/screenshot-resumo.jpg" alt="Tela de fechamento do Clube Unido mostrando quantas caixas comprar da Korin, sem sobra"
                className="rounded-[20px] w-full h-auto block" />
            </div>
          </div>
        </div>
      </section>

      {/* POR QUE EXISTE */}
      <section className="bg-white border-y border-[#14241B]/5">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Por que existe</div>
          <p className="text-lg md:text-xl leading-relaxed text-[#14241B]/80">
            Hoje, organizar um pedido coletivo da Korin costuma significar anotar cada pedido à mão — chegou
            por WhatsApp, por ligação ou de viva voz — depois somar tudo pra saber quantas caixas comprar, e
            separar o total de cada membro numa planilha. O Clube Unido faz esse trabalho automaticamente:
            não importa como o pedido chegou até você, incluir é simples — manualmente, colando a mensagem do
            WhatsApp, ou deixando o membro pedir direto pelo link do catálogo. Cada Dedicante com seu próprio
            catálogo, cada membro pedindo do jeito que for mais fácil pra ele.
          </p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3 text-center">Como funciona</div>
        <h2 className="text-2xl md:text-3xl font-semibold leading-snug text-center max-w-2xl mx-auto" style={display}>
          4 passos simples — e o guia completo mostra cada um com print de tela
        </h2>
        <div className="grid md:grid-cols-4 gap-8 mt-12">
          {PASSOS.map(p => (
            <div key={p.n}>
              <div className="text-sm font-medium text-[#1A5C38]/50 mb-2" style={mono}>{p.n}</div>
              <div className="font-semibold text-lg mb-2" style={display}>{p.titulo}</div>
              <p className="text-[#14241B]/65 text-[0.95rem] leading-relaxed">{p.texto}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <a href="/ajuda" className="text-sm font-semibold text-[#1A5C38] hover:text-[#0F3D24] transition-colors">
            Ver o passo a passo completo, com prints →
          </a>
        </div>
      </section>

      {/* HOOK: CATÁLOGO SE MONTA SOZINHO */}
      <div className="bg-white border-y border-[#14241B]/5">
        <Hook
          eyebrow="Sem digitar nada"
          titulo="Tira uma foto ou sobe a planilha da Korin. O catálogo se monta sozinho."
          corpo={<>Você manda a tabela de preços que a Korin manda todo mês — foto ou a planilha oficial mesmo. O sistema
            lê os produtos, organiza por categoria e identifica se é o mesmo mês ou um período novo, sem você
            digitar um número.</>}
          img="/screenshot-embalagens.jpg"
          alt="Catálogo importado automaticamente no Clube Unido"
        />
      </div>

      {/* HOOK: 3 JEITOS DE RECEBER PEDIDO */}
      <Hook
        eyebrow="Você escolhe como recebe"
        titulo="3 jeitos de receber pedido — não precisa escolher só um"
        corpo="Tem membro que nunca vai clicar em link nenhum — só manda mensagem mesmo. Tem quem liga ou passa de viva voz. E tem quem prefere pedir sozinho, sem passar pela sua mão. O sistema aceita os três, ao mesmo tempo, sem confusão."
        img="/screenshot-whatsapp-ia.jpg"
        alt="Interpretação de pedido do WhatsApp por IA"
        filhos={
          <div className="mt-6 space-y-3">
            {[
              { i: '💬', t: 'Cola a mensagem do WhatsApp', d: 'Cole o texto que o membro mandou e a IA identifica produto, quantidade e código sozinha.' },
              { i: '✍️', t: 'Insere manualmente', d: 'Recebeu por ligação ou de viva voz? Monta o pedido direto na tela.' },
              { i: '🔗', t: 'Divulga o catálogo do mês', d: 'Manda o link uma vez pro grupo, e cada membro pede sozinho, sem precisar de conta.' },
            ].map(b => (
              <div key={b.t} className="flex gap-3">
                <div className="text-lg flex-shrink-0">{b.i}</div>
                <div>
                  <div className="font-semibold text-sm">{b.t}</div>
                  <p className="text-sm text-[#14241B]/65 leading-relaxed">{b.d}</p>
                </div>
              </div>
            ))}
          </div>
        }
      />

      {/* HOOK: ENTREGA EM 3 PASSOS OU LINK */}
      <div className="bg-white border-y border-[#14241B]/5">
        <Hook
          invertido
          eyebrow="Separação e entrega"
          titulo="Entrega simplificada em 3 passos — você faz, ou passa pra quem for entregar no seu lugar."
          corpo="Ajusta o que foi retirado, confirma a forma de pagamento, pronto — pedido marcado como entregue na hora, sempre os mesmos 3 passos. E quando você não pode estar lá pessoalmente, cada unidade ganha um link próprio com PIN: o representante faz exatamente os mesmos 3 passos, sem precisar de login completo."
          img="/screenshot-entrega.jpg"
          alt="Lista de entrega separada por unidade, com pedidos pendentes e entregues"
        />
      </div>

      {/* HOOK: ESTOQUE ATUALIZA SOZINHO */}
      <Hook
        eyebrow="Sem contar nada na mão"
        titulo="A mesma planilha que você manda pro fornecedor atualiza seu estoque sozinho."
        corpo="Depois de comprar, sobe de novo a mesma planilha — agora já preenchida com o que você realmente pediu pra Korin. O sistema lê a quantidade real, corrige a sobra do período e você nunca mais precisa controlar isso de cabeça ou no papel."
        img="/screenshot-estoque.jpg"
        alt="Tela de conferir compra, confirmando a quantidade real comprada da Korin"
      />

      {/* HOOK: PDV — VENDA RÁPIDA EM FEIRA E CULTO */}
      <div className="bg-white border-y border-[#14241B]/5">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Venda rápida</div>
              <h2 className="text-2xl md:text-3xl font-semibold leading-snug" style={display}>
                Precisa vender algo que não estava reservado? Com o PDV, você vende em 3 passos.
              </h2>
              <p className="mt-4 text-[#14241B]/70 leading-relaxed">
                Ideal pra dias de feira, evento ou culto — movimento maior, fila de gente, pouco
                tempo por pessoa. Um modo à parte, com grade de produtos grande e os dados do
                membro só no fim, pra quem só quer pegar e pagar.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  { i: '🎪', t: 'Estoque da própria unidade', d: 'Você diz quanto levou de cada produto pra aquela feira ou culto, e o sistema mostra quanto ainda resta enquanto vende.' },
                  { i: '⚡', t: '3 toques até a venda', d: 'Escolhe o produto, confirma a forma de pagamento, pronto. Sem tela cheia de campo, sem letra miúda.' },
                  { i: '🙋', t: 'Busca ou cadastra o membro na hora', d: 'Se não achar quem comprou, cadastra ali mesmo — telefone é opcional, não trava a venda.' },
                ].map(b => (
                  <div key={b.t} className="flex gap-3">
                    <div className="text-lg flex-shrink-0">{b.i}</div>
                    <div>
                      <div className="font-semibold text-sm">{b.t}</div>
                      <p className="text-sm text-[#14241B]/65 leading-relaxed">{b.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <div className="relative">
                <div className="absolute -inset-3 bg-[#1A5C38]/10 rounded-[32px] rotate-2" />
                <div className="relative bg-[#14241B] rounded-[28px] p-2.5 shadow-2xl shadow-[#0F3D24]/25 -rotate-1 w-[230px]">
                  <img src="/screenshot-pdv.jpg" alt="Modo de venda rápida (PDV) pra feira e culto, com estoque separado por unidade"
                    className="rounded-[20px] w-full h-auto block" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MÚLTIPLAS UNIDADES — faixa curta */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Cuida de mais de uma unidade?</div>
        <p className="text-lg md:text-xl leading-relaxed text-[#14241B]/80">
          Sem problema — o sistema foi pensado pra você cuidar de cada uma separada. Pedido,
          entrega, estoque do PDV: tudo já vem organizado por unidade, sem misturar uma com a
          outra. E na hora de comprar da Korin, você decide se junta tudo ou manda separado.
        </p>
      </section>

      {/* HOOK: PEDIDO PRO FORNECEDOR */}
      <div className="bg-white border-y border-[#14241B]/5">
        <Hook
          invertido
          eyebrow="Fechamento de compra"
          titulo="Soma os pedidos de todas as unidades, ou escolhe só as que quer enviar agora."
          corpo="Precisa mandar o pedido pra Korin e ainda contava na mão ou numa planilha solta? Marque quais unidades entram, escolha entre um pedido único (soma tudo) ou separado por unidade (uma aba pra cada), e o sistema te devolve exatamente o que pedir — em caixa fechada, com custo e venda lado a lado, pra você já saber a margem antes de fechar."
          img="/screenshot-export.jpg"
          alt="Tela de exportar pedido consolidado, escolhendo unidades e formato do arquivo"
        />
      </div>

      {/* PRO CLIENTE FINAL */}
      <section className="max-w-5xl mx-auto px-6 py-16">
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
                { i: '💬', t: 'Não importa de onde vem', d: 'Pediu pelo link, mandou mensagem no WhatsApp, ou você digitou pra ele — os três caem juntos, sem digitar nada duas vezes.' },
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
              Ver guia completo, com prints de cada passo →
            </a>
          </div>
        </div>
      </section>

      {/* PREÇO */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3 text-center">Investimento</div>
        <h2 className="text-2xl md:text-3xl font-semibold text-center" style={display}>Simples, sem letra miúda</h2>
        <p className="mt-3 text-[#14241B]/65 text-center max-w-xl mx-auto">
          Uma taxa única pra começar, e uma mensalidade que cresce só se o seu grupo crescer.
        </p>

        <div className="mt-10 grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <div className="bg-white rounded-[24px] shadow-xl shadow-[#0F3D24]/10 p-8 text-center">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#14241B]/45">Configuração Guiada</div>
            <div className="mt-3 text-4xl font-semibold text-[#14241B]" style={display}>R$ 150</div>
            <div className="mt-1 text-sm text-[#14241B]/55">única, no cadastro</div>
          </div>
          <div className="bg-white rounded-[24px] shadow-xl shadow-[#0F3D24]/10 p-8 text-center">
            <div className="text-xs font-semibold tracking-widest uppercase text-[#14241B]/45">Mensalidade</div>
            <div className="mt-3 text-4xl font-semibold text-[#14241B]" style={display}>R$ 49,90</div>
            <div className="mt-1 text-sm text-[#14241B]/55">1ª unidade · + R$ 9,90 por unidade extra</div>
          </div>
        </div>

        <div className="mt-8 max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { un: '1 unidade', valor: 'R$ 49,90' },
            { un: '4 unidades', valor: 'R$ 79,60' },
            { un: '10 unidades', valor: 'R$ 139,00' },
            { un: '16 unidades', valor: 'R$ 198,40' },
          ].map(x => (
            <div key={x.un} className="bg-[#1A5C38]/5 rounded-2xl px-3 py-4 text-center">
              <div className="text-xs text-[#14241B]/55">{x.un}</div>
              <div className="mt-1 font-semibold text-[#1A5C38]" style={mono}>{x.valor}/mês</div>
            </div>
          ))}
        </div>

        <div className="mt-8 max-w-3xl mx-auto bg-[#1A5C38]/8 border border-[#1A5C38]/15 rounded-2xl px-6 py-4 text-center">
          <p className="text-sm text-[#14241B]/80">
            <strong>Teste grátis até 08/09/2026.</strong> Depois disso, cobrança mensal recorrente todo dia 10.
            Cancele quando quiser, sem multa.
          </p>
        </div>
      </section>


      <section className="bg-[#1A5C38] text-white">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold" style={display}>Pronta pra organizar o pedido do seu grupo?</h2>
          <p className="mt-3 text-white/70 max-w-md mx-auto">Com 4 passos simples você já começa a usar — o guia mostra cada um, com print de tela.</p>
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
