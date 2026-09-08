import { useState, useEffect } from 'react'
import { getSession, onAuthChange, getOrgDoUsuario, signOut, trocarSenha } from './lib/auth'
import { supabase } from './lib/supabase'
import Login from './Login'
import UnidadesManager from './UnidadesManager'
import { toast } from './lib/dialog'

// Self-service: qualquer pessoa logada (representante ou dedicante de
// unidade) troca a própria senha sabendo a atual — não depende de admin nem
// de e-mail. "Esqueci a senha e não consigo nem entrar" é um caso diferente,
// que continua precisando de alguém com acesso total pra confirmar quem é
// (botão "Nova senha" em Config → Dedicantes, ou o Junior pra representante).
function TrocarSenhaModal({ onClose }) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova]   = useState('')
  const [confirmar, setConfirmar]   = useState('')
  const [salvando, setSalvando]     = useState(false)
  const [erro, setErro]             = useState('')

  const salvar = async () => {
    setErro('')
    if (!senhaAtual || !senhaNova || !confirmar) { setErro('Preencha os 3 campos'); return }
    if (senhaNova.length < 6) { setErro('Senha nova precisa ter no mínimo 6 caracteres'); return }
    if (senhaNova !== confirmar) { setErro('Senha nova e confirmação não são iguais'); return }
    setSalvando(true)
    const r = await trocarSenha(senhaAtual, senhaNova)
    setSalvando(false)
    if (!r.ok) { setErro(r.error); return }
    toast('Senha alterada!')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
        <div className="text-lg font-black text-green-800">🔑 Trocar minha senha</div>
        <div className="space-y-2">
          <input type="password" placeholder="Senha atual" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-green-500" />
          <input type="password" placeholder="Senha nova" value={senhaNova} onChange={e => setSenhaNova(e.target.value)}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-green-500" />
          <input type="password" placeholder="Confirmar senha nova" value={confirmar} onChange={e => setConfirmar(e.target.value)}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-green-500" />
        </div>
        {erro && <div className="text-sm text-red-600 font-semibold">{erro}</div>}
        <button onClick={salvar} disabled={salvando}
          className="w-full py-3 bg-green-700 text-white rounded-xl font-black text-sm active:bg-green-800 disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Trocar senha'}
        </button>
        <button onClick={onClose} className="w-full text-center text-xs text-stone-400 underline">Cancelar</button>
      </div>
    </div>
  )
}

// Troca o manifest do PWA pra incluir o nome da unidade no app instalado
// (ex: "Unido Gestão — JC Peruibe"). Gerado no cliente via Blob, sem precisar
// de servidor, já que o nome da org já está disponível no front após o login.
function useManifestPersonalizado(org) {
  useEffect(() => {
    if (!org?.nome) return
    const nome = org.nome
    const manifest = {
      name: `Unido Gestão — ${nome}`,
      short_name: nome.slice(0, 20),
      description: `Gestão de pedidos — ${nome}`,
      id: `unido-admin-v2-${org.slug || org.orgId}`,
      scope: '/painel',
      start_url: '/painel?source=pwa',
      display: 'standalone',
      background_color: '#f5f0eb',
      theme_color: '#1a5c38',
      orientation: 'portrait',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
    const url = URL.createObjectURL(blob)
    const link = document.querySelector('link[rel="manifest"]')
    if (link) link.setAttribute('href', url)
    document.title = manifest.name
    return () => URL.revokeObjectURL(url)
  }, [org?.nome, org?.slug, org?.orgId])
}

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checando') // checando | fora | dentro
  const [org, setOrg] = useState(null)
  const [erroOrg, setErroOrg] = useState(false)
  const [unidadesOk, setUnidadesOk] = useState(null) // null=checando | true | false (precisa onboarding)
  const [trocandoSenha, setTrocandoSenha] = useState(false)

  useManifestPersonalizado(org)

  useEffect(() => {
    if (!org?.orgId) { setUnidadesOk(null); return }
    let cancelado = false
    ;(async () => {
      if (!supabase) { setUnidadesOk(true); return }
      const { data, error } = await supabase.from('org_unidades').select('id').eq('org_id', org.orgId).limit(1)
      if (cancelado) return
      // Erro de rede não deve travar quem já está usando o app — só bloqueia se confirmarmos que está vazio
      setUnidadesOk(error ? true : (data?.length || 0) > 0)
    })()
    return () => { cancelado = true }
  }, [org?.orgId])

  const resolverOrg = async (tentativas = 4) => {
    setStatus('checando')
    for (let i = 0; i < tentativas; i++) {
      const o = await getOrgDoUsuario()
      if (o) { setOrg(o); setErroOrg(false); setStatus('dentro'); return }
      if (i < tentativas - 1) await new Promise(r => setTimeout(r, 600))
    }
    setErroOrg(true)
    setStatus('fora')
    await signOut()
  }

  useEffect(() => {
    // Guarda o usuário da sessão atual pra comparar em cada evento de auth —
    // não dá pra confiar só no nome do evento (TOKEN_REFRESHED cobre a
    // renovação em segundo plano, mas o supabase-js também recupera/reafirma
    // a sessão de outros jeitos quando a aba volta a ficar em foco, sem
    // necessariamente usar esse nome). Só reseta a tela quando o usuário de
    // fato mudou (login novo/diferente) ou sumiu (logout) — mesmo usuário
    // continuando logado nunca remonta o app.
    let usuarioAtual = null

    ;(async () => {
      const session = await getSession()
      usuarioAtual = session?.user?.id || null
      if (session) await resolverOrg()
      else setStatus('fora')
    })()

    const unsubscribe = onAuthChange(async (session) => {
      const usuarioDoEvento = session?.user?.id || null
      if (usuarioDoEvento === usuarioAtual) return
      usuarioAtual = usuarioDoEvento
      if (session) await resolverOrg()
      else { setOrg(null); setStatus('fora') }
    })
    return unsubscribe
  }, [])

  if (status === 'checando') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="text-green-800 text-xl font-black animate-pulse">Carregando… 🌿</div>
      </div>
    )
  }

  if (status === 'fora') {
    return (
      <>
        {erroOrg && (
          <div className="bg-red-50 text-red-700 text-xs text-center py-2 px-4">
            Não encontramos uma organização vinculada a essa conta. Fale com o suporte.
          </div>
        )}
        <Login onSuccess={resolverOrg} />
      </>
    )
  }

  if (status === 'dentro') {
    if (org?.bloqueado) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-stone-50 px-6">
          <div className="text-center max-w-sm">
            <div className="text-4xl mb-3">🔒</div>
            <div className="text-stone-800 font-black text-xl mb-2">Trial Atingido</div>
            <p className="text-stone-500 text-sm mb-1">
              O período de teste do <strong>{org?.nome}</strong> terminou em{' '}
              {new Date(org.trialFim + 'T12:00:00').toLocaleDateString('pt-BR')}.
            </p>
            <p className="text-stone-500 text-sm mb-6">Fale com a gente pra liberar de novo.</p>
            <a href="https://wa.me/5511957737933" target="_blank" rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-green-700 text-white rounded-xl font-black text-sm active:bg-green-800">
              Falar no WhatsApp
            </a>
            <button onClick={signOut} className="block w-full text-center text-xs text-stone-400 mt-5 underline">Sair</button>
          </div>
        </div>
      )
    }
    if (unidadesOk === null) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-stone-50">
          <div className="text-green-800 text-xl font-black animate-pulse">Carregando… 🌿</div>
        </div>
      )
    }
    if (unidadesOk === false) {
      return (
        <UnidadesManager
          orgId={org.orgId}
          modo="onboarding"
          montarHosts
          onConcluir={() => setUnidadesOk(true)}
        />
      )
    }
    return (
      <>
        {children(org, () => resolverOrg(1))}
        <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2">
          <button
            onClick={() => setTrocandoSenha(true)}
            className="bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg opacity-70 active:opacity-100"
          >
            🔑 Senha
          </button>
          <button
            onClick={signOut}
            className="bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg opacity-70 active:opacity-100"
          >
            Sair ({org?.nome?.split(' ')[0] || 'conta'})
          </button>
        </div>
        {trocandoSenha && <TrocarSenhaModal onClose={() => setTrocandoSenha(false)} />}
      </>
    )
  }

  return null
}
