import SiteFooter from './lib/SiteFooter'

const display = { fontFamily: "'Space Grotesk', sans-serif" }
const mono = { fontFamily: "'JetBrains Mono', monospace" }

const PASSOS = [
  {
    n: '01',
    titulo: 'Crie sua conta',
    texto: 'Na tela de entrada, toque em "Ainda não tem conta? Criar agora". Informe o nome do seu clube/grupo, escolha o link do catálogo (ex: meu-clube), e seu email e senha.',
  },
  {
    n: '02',
    titulo: 'Cadastre suas unidades de retirada',
    texto: 'Logo após criar a conta, o sistema pede pra cadastrar pelo menos um local de retirada — nome e endereço. É obrigatório só nesse primeiro momento; depois você edita quando quiser.',
  },
  {
    n: '03',
    titulo: 'Importe a primeira tabela de preços',
    texto: 'Na aba Web → Config, toque em "Importar catálogo da Korin" e tire uma foto da tabela de preços. O sistema lê os produtos e cria o período automaticamente — sem digitar nada.',
  },
  {
    n: '04',
    titulo: 'Compartilhe o link do catálogo',
    texto: 'Ainda na aba Web → Config tem um link pronto pra copiar e enviar pros seus clientes. Eles pedem direto por ali, sem precisar instalar nada.',
  },
  {
    n: '05',
    titulo: 'Acompanhe os pedidos',
    texto: 'Na aba Pedidos você vê tudo que chegou, pode editar, marcar como entregue ou colar um pedido recebido por WhatsApp.',
  },
  {
    n: '06',
    titulo: 'Feche a compra do mês',
    texto: 'Na aba Fechamento, o sistema soma tudo e mostra quantas caixas comprar de cada produto. Dá pra exportar em planilha pra levar direto pra Korin.',
  },
]

const FAQ = [
  {
    p: 'Como eu viro o mês?',
    r: 'Importe a tabela de preços nova na aba Web. O sistema compara com o período atual: se for o mesmo mês, só atualiza os preços; se for um mês diferente, ele cria um período novo automaticamente e pede a data limite de pedidos.',
  },
  {
    p: 'Os pedidos do mês anterior se perdem quando eu importo um catálogo novo?',
    r: 'Não. Cada mês fica guardado separadamente. Dá pra consultar qualquer período anterior na aba Fechamento, mesmo depois de arquivado.',
  },
  {
    p: 'Posso ter mais de uma unidade de retirada?',
    r: 'Sim, quantas precisar. Gerencie em Web → Unidades.',
  },
  {
    p: 'Preciso preencher CPF/CNPJ pra usar o sistema?',
    r: 'Não é obrigatório. É só pra identificação caso o sistema passe a ter cobrança ou integração com outros serviços no futuro. Você completa quando quiser, em Web → Dados.',
  },
]

export default function Ajuda() {
  return (
    <div className="bg-[#F6F2EA] text-[#14241B] min-h-screen">
      <nav className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src="/logo-korin.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="font-semibold text-sm" style={display}>Clube de Compras Korin</span>
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
          Pra uma coordenadora nova começar a usar sozinha, sem precisar perguntar nada pra ninguém.
        </p>
      </header>

      <section className="max-w-3xl mx-auto px-6 pb-16">
        <ol className="space-y-8">
          {PASSOS.map(p => (
            <li key={p.n} className="flex gap-5">
              <div className="text-sm font-medium text-[#1A5C38]/45 pt-0.5 flex-shrink-0 w-7" style={mono}>{p.n}</div>
              <div>
                <div className="font-semibold text-lg" style={display}>{p.titulo}</div>
                <p className="mt-1.5 text-[#14241B]/70 leading-relaxed">{p.texto}</p>
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
