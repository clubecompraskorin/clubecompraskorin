import { useState, useEffect } from 'react'
import { getSession, onAuthChange, getOrgDoUsuario, signOut } from './lib/auth'
import Login from './Login'

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checando') // checando | fora | dentro
  const [org, setOrg] = useState(null)
  const [erroOrg, setErroOrg] = useState(false)

  const resolverOrg = async () => {
    const o = await getOrgDoUsuario()
    if (!o) { setErroOrg(true); setStatus('fora'); await signOut(); return }
    setOrg(o)
    setErroOrg(false)
    setStatus('dentro')
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
        <Login onSuccess={() => setStatus('checando')} />
      </>
    )
  }

  return children(org)
}
