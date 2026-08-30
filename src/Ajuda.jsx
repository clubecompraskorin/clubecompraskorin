import SiteFooter from './lib/SiteFooter'
import { PASSOS_GUIA as PASSOS } from './lib/onboardingSteps'

const display = { fontFamily: "'Space Grotesk', sans-serif" }
const mono = { fontFamily: "'JetBrains Mono', monospace" }

const FAQ = [
  {
    p: 'Como eu viro o mês?',
    r: 'Importe a tabela de preços nova na aba Config. O sistema compara com o período atual: se for o mesmo mês, só atualiza os preços; se for um mês diferente, ele cria um período novo automaticamente e pede a data limite de pedidos.',
  },
  {
    p: 'Os pedidos do mês anterior se perdem quando eu importo um catálogo novo?',
    r: 'Não. Cada mês fica guardado separadamente. Dá pra consultar qualquer período anterior na aba Fechamento, mesmo depois de arquivado.',
  },
  {
    p: 'Posso ter mais de uma unidade de retirada?',
    r: 'Sim, quantas precisar. Gerencie em Config → Unidades.',
  },
  {
    p: 'Preciso preencher CPF/CNPJ pra usar o sistema?',
    r: 'Não é obrigatório. É só pra identificação caso o sistema passe a ter cobrança ou integração com outros serviços no futuro. Você completa quando quiser, em Config → Dados.',
  },
  {
    p: 'Como funciona o link de entrega por PIN?',
    r: 'Em Config → Unidades, gere o link daquela unidade — o sistema cria um PIN de 4 dígitos. Passe o link e o PIN pro representante; ele acessa pelo celular sem precisar de login completo, vê só os pedidos daquela unidade, separa e confirma a entrega. Se trocar de representante, é só gerar um PIN novo — o antigo para de funcionar.',
  },
  {
    p: 'Como sei quanto sobrou de cada produto pro próximo período?',
    r: 'Em Config → Estoque, assim que você confirma a primeira compra do mês, o sistema mostra Comprado / Entregue / Reservado e a Sobra de cada produto — atualiza sozinho a cada pedido. A sobra do período anterior já entra somada automaticamente no mês novo.',
  },
]

export default function Ajuda() {
  return (
    <div className="bg-[#F6F2EA] text-[#14241B] min-h-screen">
      <nav className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <a href="/">
          <img src="/logo-clube-unido.png" alt="Clube Unido" className="h-11 w-auto" />
        </a>
        <a href="/painel" className="text-sm font-semibold text-[#1A5C38] hover:text-[#0F3D24] transition-colors">
          Entrar →
        </a>
      </nav>

      <header className="max-w-3xl mx-auto px-6 pt-6 pb-12">
        <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-3">Guia completo</div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight" style={display}>
          Do cadastro ao primeiro pedido recebido
        </h1>
        <p className="mt-3 text-[#14241B]/65 leading-relaxed">
          Pra quem está começando agora como Dedicante, sem precisar perguntar nada pra ninguém.
        </p>
      </header>

      <section className="max-w-3xl mx-auto px-6 pb-16">
        <ol className="space-y-14">
          {PASSOS.map((p, i) => (
            <li key={p.n} className={`grid sm:grid-cols-[1fr_auto] gap-6 items-center ${i % 2 === 1 ? 'sm:[&>*:first-child]:order-2' : ''}`}>
              <div className="flex gap-5">
                <div className="text-sm font-medium text-[#1A5C38]/45 pt-0.5 flex-shrink-0 w-7" style={mono}>{p.n}</div>
                <div>
                  <div className="font-semibold text-lg" style={display}>{p.titulo}</div>
                  <p className="mt-1.5 text-[#14241B]/70 leading-relaxed">{p.texto}</p>
                </div>
              </div>
              <div className="flex justify-center sm:justify-start flex-shrink-0">
                <div className="relative">
                  <div className="absolute -inset-2.5 bg-[#1A5C38]/10 rounded-[26px] rotate-1" />
                  <div className="relative bg-[#14241B] rounded-[24px] p-2 shadow-xl shadow-[#0F3D24]/20 -rotate-1 w-[170px]">
                    <img src={p.img} alt={p.alt} className="rounded-[16px] w-full h-auto block" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-white border-y border-[#14241B]/5">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-xs font-semibold tracking-widest uppercase text-[#1A5C38]/70 mb-8">Perguntas frequentes</div>
          <div className="space-y-7">
            {FAQ.map(f => (
              <div key={f.p}>
                <div className="font-semibold text-[1.05rem]">{f.p}</div>
                <p className="mt-1.5 text-[#14241B]/65 leading-relaxed text-[0.95rem]">{f.r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="font-semibold text-lg mb-2" style={display}>Ainda com dúvida?</div>
        <p className="text-[#14241B]/65 mb-6">Fale direto com o suporte pelo WhatsApp.</p>
        <a href="https://wa.me/5511957737933" target="_blank" rel="noopener noreferrer"
          className="inline-block px-6 py-3.5 rounded-xl bg-[#1A5C38] text-white font-semibold text-sm hover:bg-[#0F3D24] transition-colors">
          Falar no WhatsApp
        </a>
      </section>

      <SiteFooter />
    </div>
  )
}
