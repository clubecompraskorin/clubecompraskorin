import { useEffect, useState, useCallback } from 'react'
import { getSession, onAuthChange, signIn, signOut, signUpSemOrganizacao, isPlatformAdmin } from './lib/auth'
import { getOrganizacoesGestor, getPedidosCountPorOrg, setOrgAtivo, setPagoAte, setPermiteDedicanteUnidade, getCobrancasGestor, processarCancelamento, descartarCancelamento } from './lib/platform'
import { listarProdutosParaFotos, cadastrarFotoProduto } from './lib/fotosGestor'

const display = { fontFamily: "'Space Grotesk', sans-serif" }
const mono = { fontFamily: "'JetBrains Mono', monospace" }

function TelaLogin({ onEntrou }) {
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErro(''); setCarregando(true)
    const r = modo === 'login' ? await signIn(email, password) : await signUpSemOrganizacao(email, password)
    setCarregando(false)
    if (r.ok) onEntrou()
    else setErro(r.error)
  }

  return (
    <div className="min-h-screen bg-[#0B1410] text-white flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <div className="text-xs tracking-widest uppercase text-white/40 mb-2" style={mono}>Acesso restrito</div>
        <h1 className="text-2xl font-semibold mb-8" style={display}>Painel do gestor</h1>

        <label className="block text-xs font-semibold text-white/50 mb-1">Email</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-white/30" />

        <label className="block text-xs font-semibold text-white/50 mb-1">Senha</label>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-white/30" />

        {erro && <div className="text-xs text-red-400 mb-4">{erro}</div>}

        <button type="submit" disabled={carregando}
          className="w-full py-3.5 bg-white text-[#0B1410] rounded-xl font-semibold text-sm disabled:opacity-50">
          {carregando ? '...' : modo === 'login' ? 'Entrar' : 'Criar acesso'}
        </button>

        <button type="button" onClick={() => setModo(modo === 'login' ? 'criar' : 'login')}
          className="w-full text-center text-xs text-white/30 mt-4 hover:text-white/60 transition-colors">
          {modo === 'login' ? 'Primeiro acesso? Criar conta' : 'Já tenho conta'}
        </button>
      </form>
    </div>
  )
}

function TelaSemPermissao() {
  return (
    <div className="min-h-screen bg-[#0B1410] text-white flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">🔒</div>
        <div className="font-semibold text-lg mb-2" style={display}>Sem permissão</div>
        <p className="text-sm text-white/50 mb-6">Essa conta não tem acesso ao painel do gestor.</p>
        <button onClick={signOut} className="text-sm text-white/40 underline hover:text-white/70">Sair</button>
      </div>
    </div>
  )
}

const fmtData = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const hojeISO = () => new Date().toISOString().slice(0, 10)

function StatusPagamento({ org }) {
  const hoje = hojeISO()
  const bloqueado = org.trial_fim && hoje > org.trial_fim && (!org.pago_ate || hoje > org.pago_ate)
  const pago = org.pago_ate && hoje <= org.pago_ate
  if (bloqueado) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">🔒 trial atingido</span>
  if (pago) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">pago até {fmtData(org.pago_ate)}</span>
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">trial até {fmtData(org.trial_fim)}</span>
}

function AssinaturaBadge({ status }) {
  if (status === 'ativa') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">assinatura ativa</span>
  if (status === 'cancelada') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">assinatura cancelada</span>
  return null
}

function CobrancasResumo({ lista }) {
  if (!lista?.length) return <div className="text-xs text-white/30 mt-1">Nenhuma cobrança gerada ainda</div>
  const ultima = lista[0]
  const rotuloStatus = { pago: '✅ paga', pendente: '⏳ pendente', vencido: '🔴 vencida', cancelado: '⚪ cancelada' }
  const rotuloTipo = { mensalidade: 'Mensalidade', configuracao_guiada: 'Config. Guiada' }
  return (
    <div className="text-xs text-white/40 mt-1">
      {lista.length} cobrança{lista.length > 1 ? 's' : ''} · última: {rotuloTipo[ultima.tipo]} R$ {Number(ultima.valor).toFixed(2).replace('.', ',')} {rotuloStatus[ultima.status]}
    </div>
  )
}

function PedidoCancelamento({ org, onResolvido }) {
  const [processando, setProcessando] = useState(null) // 'efetivar' | 'ignorar' | null

  const efetivar = async () => {
    setProcessando('efetivar')
    const r = await processarCancelamento(org.id)
    setProcessando(null)
    if (r.ok) onResolvido(org.id, { assinatura_status: 'cancelada', cancelamento_solicitado_em: null })
  }

  const ignorar = async () => {
    setProcessando('ignorar')
    const r = await descartarCancelamento(org.id)
    setProcessando(null)
    if (r.ok) onResolvido(org.id, { cancelamento_solicitado_em: null })
  }

  return (
    <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="text-xs text-amber-400 flex-1">
        🟠 Cancelamento pedido em {fmtData(org.cancelamento_solicitado_em)}
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button onClick={ignorar} disabled={processando}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 disabled:opacity-40">
          {processando === 'ignorar' ? '...' : 'Ignorar'}
        </button>
        <button onClick={efetivar} disabled={processando}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40">
          {processando === 'efetivar' ? '...' : 'Efetivar cancelamento'}
        </button>
      </div>
    </div>
  )
}

function MarcarPago({ org, onSalvo }) {
  const [data, setData] = useState(org.pago_ate || '')
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    if (!data) return
    setSalvando(true)
    const r = await setPagoAte(org.id, data)
    setSalvando(false)
    if (r.ok) onSalvo(org.id, data)
  }

  return (
    <div className="flex items-center gap-1.5">
      <input type="date" value={data} onChange={e => setData(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30" />
      <button onClick={salvar} disabled={salvando || !data}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40">
        {salvando ? '...' : 'Marcar pago'}
      </button>
    </div>
  )
}

function ToggleDedicanteUnidade({ org, onSalvo }) {
  const [salvando, setSalvando] = useState(false)
  const ligado = Boolean(org.permite_dedicante_unidade)

  const toggle = async () => {
    setSalvando(true)
    const r = await setPermiteDedicanteUnidade(org.id, !ligado)
    setSalvando(false)
    if (r.ok) onSalvo(org.id, !ligado)
  }

  return (
    <button onClick={toggle} disabled={salvando}
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors disabled:opacity-40 ${ligado ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}>
      {salvando ? '...' : ligado ? '🧑‍💼 dedicantes liberado' : '🧑‍💼 dedicantes bloqueado'}
    </button>
  )
}

// Modal de upload -- aparece tanto pra um produto já conhecido (clicou
// "+ foto"/"trocar" na lista) quanto pra um cadastrado na mão (código nem
// sempre existe ainda em nenhuma organização).
function ModalUploadFoto({ produto, onFechar, onSalvo }) {
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const escolherArquivo = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setArquivo(f)
    setPreview(URL.createObjectURL(f))
    setErro('')
  }

  const salvar = async () => {
    if (!arquivo) { setErro('Escolha uma imagem'); return }
    setEnviando(true); setErro('')
    const r = await cadastrarFotoProduto({ nomeKorin: produto.nome, cod: produto.cod, arquivo })
    setEnviando(false)
    if (!r.ok) { setErro(r.error); return }
    onSalvo(produto.cod, r.url)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-[#0B1410] border border-white/10 rounded-3xl p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
        <div className="font-semibold text-white" style={display}>{produto.foto ? 'Trocar foto' : 'Adicionar foto'}</div>
        <div className="text-xs text-white/50">
          {produto.cod != null && <span className="text-white/70 font-semibold" style={mono}>#{produto.cod}</span>} {produto.nome}
        </div>

        {preview ? (
          <img src={preview} alt="Prévia" className="w-full h-40 object-contain bg-white/5 rounded-xl" />
        ) : produto.foto ? (
          <img src={produto.foto} alt="Foto atual" className="w-full h-40 object-contain bg-white/5 rounded-xl opacity-60" />
        ) : (
          <div className="w-full h-40 flex items-center justify-center bg-white/5 rounded-xl text-white/20 text-4xl">📷</div>
        )}

        <label className="block">
          <div className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-center text-sm font-semibold cursor-pointer transition-colors">
            {arquivo ? arquivo.name : 'Escolher imagem…'}
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={escolherArquivo} />
        </label>

        {erro && <div className="text-xs text-red-400">{erro}</div>}

        <div className="flex gap-2">
          <button onClick={onFechar} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold transition-colors">Cancelar</button>
          <button onClick={salvar} disabled={enviando || !arquivo}
            className="flex-1 py-3 bg-white text-[#0B1410] rounded-xl text-sm font-semibold disabled:opacity-40">
            {enviando ? 'Enviando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TabFotos() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState(null)
  const [novoCod, setNovoCod] = useState('')
  const [novoNome, setNovoNome] = useState('')

  const carregar = useCallback(() => {
    setLoading(true)
    listarProdutosParaFotos().then(l => { setProdutos(l); setLoading(false) })
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const filtrados = produtos.filter(p =>
    !busca || String(p.cod).includes(busca) || p.nome?.toLowerCase().includes(busca.toLowerCase())
  )
  const semFoto = produtos.filter(p => !p.foto).length

  const salvo = (cod, url) => {
    setProdutos(prev => {
      const existe = prev.some(p => p.cod === cod)
      if (existe) return prev.map(p => p.cod === cod ? { ...p, foto: url } : p)
      return prev // cadastro manual de produto ainda não visto em nenhum período -- não força ele a aparecer na lista, evita duplicar se depois vier de verdade num import
    })
    setSelecionado(null)
  }

  const adicionarManual = () => {
    if (!novoNome.trim()) return
    setSelecionado({ cod: novoCod.trim() ? Number(novoCod) : null, nome: novoNome.trim(), foto: null })
    setNovoCod(''); setNovoNome('')
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-white/40 mb-1">Produtos sem foto</div>
          <div className="text-3xl font-semibold" style={display}>{semFoto}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-white/40 mb-1">Produtos conhecidos</div>
          <div className="text-3xl font-semibold" style={display}>{produtos.length}</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 space-y-2">
        <div className="text-xs text-white/40">Cadastrar produto novo (ainda não apareceu em nenhum pedido)</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <input value={novoCod} onChange={e => setNovoCod(e.target.value.replace(/\D/g, ''))} placeholder="Código"
              className="w-24 sm:w-28 flex-shrink-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-white/30" style={mono} />
            <input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Nome do produto"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-white/30" />
          </div>
          <button onClick={adicionarManual} disabled={!novoNome.trim()}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold disabled:opacity-30 transition-colors sm:flex-shrink-0">
            📷 Foto
          </button>
        </div>
      </div>

      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por código ou nome..."
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-white/30" />

      {loading ? (
        <div className="text-white/40 text-sm py-12 text-center">Carregando…</div>
      ) : filtrados.length === 0 ? (
        <div className="text-white/40 text-sm py-12 text-center">Nenhum produto encontrado.</div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(p => (
            <div key={p.cod} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
              {p.foto ? (
                <img src={p.foto} alt={p.nome} className="w-12 h-12 object-contain bg-white/5 rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-lg text-white/20 flex-shrink-0">📷</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.nome}</div>
                <div className="text-xs text-white/40" style={mono}>#{p.cod}</div>
              </div>
              <button onClick={() => setSelecionado(p)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl flex-shrink-0 transition-colors ${p.foto ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}>
                {p.foto ? 'Trocar' : '+ Foto'}
              </button>
            </div>
          ))}
        </div>
      )}

      {selecionado && <ModalUploadFoto produto={selecionado} onFechar={() => setSelecionado(null)} onSalvo={salvo} />}
    </div>
  )
}

function Dashboard() {
  const [orgs, setOrgs] = useState([])
  const [contagem, setContagem] = useState({})
  const [cobrancas, setCobrancas] = useState({})
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [togglingId, setTogglingId] = useState(null)
  const [aba, setAba] = useState('orgs')

  const carregar = useCallback(async () => {
    setLoading(true)
    const [lista, ped, cob] = await Promise.all([getOrganizacoesGestor(), getPedidosCountPorOrg(), getCobrancasGestor()])
    setOrgs(lista); setContagem(ped); setCobrancas(cob)
    setLoading(false)
  }, [])

  const atualizarOrg = (id, patch) => setOrgs(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o))

  useEffect(() => { carregar() }, [carregar])

  const toggle = async (org) => {
    setTogglingId(org.id)
    const r = await setOrgAtivo(org.id, !org.ativo)
    setTogglingId(null)
    if (r.ok) setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, ativo: !o.ativo } : o))
  }

  const filtradas = orgs.filter(o =>
    !busca || o.nome?.toLowerCase().includes(busca.toLowerCase()) || o.slug?.toLowerCase().includes(busca.toLowerCase())
  )

  const ativas = orgs.filter(o => o.ativo).length
  const totalPedidos = Object.values(contagem).reduce((s, n) => s + n, 0)

  return (
    <div className="min-h-screen bg-[#0B1410] text-white">
      <header className="border-b border-white/10 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div>
          <div className="text-xs tracking-widest uppercase text-white/40" style={mono}>Painel do gestor</div>
          <div className="font-semibold text-lg" style={display}>Clube Unido</div>
        </div>
        <button onClick={signOut} className="text-xs text-white/40 hover:text-white/70 transition-colors">Sair</button>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-5 flex gap-2">
        {[{ id: 'orgs', label: 'Organizações' }, { id: 'fotos', label: '📷 Fotos' }].map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition-colors ${aba === t.id ? 'bg-white text-[#0B1410]' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
      {aba === 'fotos' ? <TabFotos /> : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-white/40 mb-1">Organizações ativas</div>
            <div className="text-3xl font-semibold" style={display}>{ativas}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-white/40 mb-1">Total de organizações</div>
            <div className="text-3xl font-semibold" style={display}>{orgs.length}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-white/40 mb-1">Total de pedidos</div>
            <div className="text-3xl font-semibold" style={display}>{totalPedidos}</div>
          </div>
        </div>

        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou link..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-white/30" />

        {loading ? (
          <div className="text-white/40 text-sm py-12 text-center">Carregando…</div>
        ) : filtradas.length === 0 ? (
          <div className="text-white/40 text-sm py-12 text-center">Nenhuma organização ainda.</div>
        ) : (
          <div className="space-y-2">
            {filtradas.map(org => {
              const completo = Boolean(org.responsavel_nome?.trim() && org.documento?.trim())
              return (
                <div key={org.id} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{org.nome}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${org.ativo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {org.ativo ? 'ativa' : 'inativa'}
                      </span>
                      <StatusPagamento org={org} />
                      <AssinaturaBadge status={org.assinatura_status} />
                      <ToggleDedicanteUnidade org={org} onSalvo={(id, permite) => setOrgs(prev => prev.map(o => o.id === id ? { ...o, permite_dedicante_unidade: permite } : o))} />
                      {!completo && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">cadastro incompleto</span>
                      )}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5" style={mono}>/{org.slug}</div>
                    <div className="text-xs text-white/50 mt-1">
                      {org.responsavel_nome || '— sem responsável —'}
                      {org.documento && <span className="text-white/30"> · {org.documento}</span>}
                    </div>
                    <div className="mt-2">
                      <MarcarPago org={org} onSalvo={(id, pagoAte) => setOrgs(prev => prev.map(o => o.id === id ? { ...o, pago_ate: pagoAte } : o))} />
                    </div>
                    <CobrancasResumo lista={cobrancas[org.id]} />
                    {org.cancelamento_solicitado_em && (
                      <PedidoCancelamento org={org} onResolvido={atualizarOrg} />
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-white/30" style={mono}>{fmtData(org.created_at)}</div>
                    <div className="text-sm font-semibold mt-0.5">{contagem[org.id] || 0} pedidos</div>
                  </div>
                  <button onClick={() => toggle(org)} disabled={togglingId === org.id}
                    className={`text-xs font-semibold px-4 py-2 rounded-xl flex-shrink-0 transition-colors disabled:opacity-40 ${org.ativo ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}>
                    {togglingId === org.id ? '...' : org.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        </>
      )}
      </main>
    </div>
  )
}

export default function Gestor() {
  const [carregando, setCarregando] = useState(true)
  const [sessao, setSessao] = useState(null)
  const [admin, setAdmin] = useState(null)

  const checar = async () => {
    const s = await getSession()
    setSessao(s)
    if (s) setAdmin(await isPlatformAdmin())
    else setAdmin(null)
    setCarregando(false)
  }

  useEffect(() => {
    checar()
    const unsub = onAuthChange(() => checar())
    return unsub
  }, [])

  if (carregando) return <div className="min-h-screen bg-[#0B1410]" />
  if (!sessao) return <TelaLogin onEntrou={checar} />
  if (!admin) return <TelaSemPermissao />
  return <Dashboard />
}
