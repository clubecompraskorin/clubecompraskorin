import { useEffect, useState, useCallback } from 'react'
import { getSession, onAuthChange, signIn, signOut, signUpSemOrganizacao, isPlatformAdmin } from './lib/auth'
import { getOrganizacoesGestor, getPedidosCountPorOrg, setOrgAtivo } from './lib/platform'

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

function Dashboard() {
  const [orgs, setOrgs] = useState([])
  const [contagem, setContagem] = useState({})
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [lista, ped] = await Promise.all([getOrganizacoesGestor(), getPedidosCountPorOrg()])
    setOrgs(lista); setContagem(ped)
    setLoading(false)
  }, [])

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
          <div className="font-semibold text-lg" style={display}>Clube de Compras Korin</div>
        </div>
        <button onClick={signOut} className="text-xs text-white/40 hover:text-white/70 transition-colors">Sair</button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
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
                      {!completo && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">cadastro incompleto</span>
                      )}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5" style={mono}>/{org.slug}</div>
                    <div className="text-xs text-white/50 mt-1">
                      {org.responsavel_nome || '— sem responsável —'}
                      {org.documento && <span className="text-white/30"> · {org.documento}</span>}
                    </div>
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
