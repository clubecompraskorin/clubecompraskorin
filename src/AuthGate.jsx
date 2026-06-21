import { useState, useEffect } from 'react'
import { getSession, onAuthChange, getOrgDoUsuario, signOut } from './lib/auth'
import Login from './Login'

// Troca o manifest do PWA pra incluir o nome da unidade no app instalado
// (ex: "Korin Gestão — JC Peruibe"). Gerado no cliente via Blob, sem precisar
// de servidor, já que o nome da org já está disponível no front após o login.
function useManifestPersonalizado(org) {
  useEffect(() => {
    if (!org?.nome) return
    const nome = org.nome
    const manifest = {
      name: `Korin Gestão — ${nome}`,
      short_name: nome.slice(0, 20),
      description: `Gestão de pedidos — ${nome}`,
      id: `korin-admin-v2-${org.slug || org.orgId}`,
      scope: '/',
      start_url: '/?source=pwa',
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

  useManifestPersonalizado(org)

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
    (async () => {
      const session = await getSession()
      if (session) await resolverOrg()
      else setStatus('fora')
    })()

    const unsubscribe = onAuthChange(async (session) => {
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
    return (
      <>
        {children(org)}
        <button
          onClick={signOut}
          className="fixed bottom-3 right-3 z-50 bg-stone-800 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg opacity-70 active:opacity-100"
        >
          Sair ({org?.nome?.split(' ')[0] || 'conta'})
        </button>
      </>
    )
  }

  return null
}
