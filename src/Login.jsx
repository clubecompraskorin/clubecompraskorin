import { useState } from 'react'
import { signIn, signUpComOrganizacao } from './lib/auth'

const slugify = (s) => s
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .slice(0, 40)

export default function Login({ onSuccess }) {
  const [modo, setModo] = useState('login') // login | cadastro
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nomeOrg, setNomeOrg] = useState('')
  const [slugOrg, setSlugOrg] = useState('')
  const [slugEditado, setSlugEditado] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleNomeOrg = (v) => {
    setNomeOrg(v)
    if (!slugEditado) setSlugOrg(slugify(v))
  }

  const submit = async (e) => {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    if (modo === 'login') {
      const r = await signIn(email, password)
      setCarregando(false)
      if (!r.ok) return setErro(r.error)
      onSuccess()
      return
    }

    if (!nomeOrg.trim() || !slugOrg.trim()) {
      setCarregando(false)
      return setErro('Preencha o nome do seu clube/grupo.')
    }
    const r = await signUpComOrganizacao({ email, password, nomeOrg, slugOrg })
    setCarregando(false)
    if (!r.ok) return setErro(r.error)
    onSuccess()
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🌿</div>
          <div className="text-xl font-black text-green-800">Korin Gestão</div>
          <div className="text-sm text-stone-500">
            {modo === 'login' ? 'Entre na sua conta' : 'Crie sua conta de coordenadora'}
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 space-y-3">
          {modo === 'cadastro' && (
            <>
              <div>
                <label className="text-xs font-bold text-stone-600">Nome do seu clube/grupo</label>
                <input
                  type="text" required value={nomeOrg}
                  onChange={e => handleNomeOrg(e.target.value)}
                  placeholder="Ex: Clube de Compras Korin"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-300 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600">Link do seu catálogo</label>
                <div className="flex items-center mt-1 text-sm">
                  <span className="text-stone-400 mr-1">/</span>
                  <input
                    type="text" required value={slugOrg}
                    onChange={e => { setSlugEditado(true); setSlugOrg(slugify(e.target.value)) }}
                    placeholder="meu-clube"
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold text-stone-600">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-300 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-600">Senha</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              minLength={6}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-300 text-sm"
            />
          </div>

          {erro && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}

          <button
            type="submit" disabled={carregando}
            className="w-full bg-green-700 text-white font-black py-2.5 rounded-xl text-sm disabled:opacity-50"
          >
            {carregando ? 'Aguarde…' : modo === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          onClick={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setErro('') }}
          className="w-full text-center text-sm text-green-700 font-bold mt-4"
        >
          {modo === 'login' ? 'Ainda não tem conta? Criar agora' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}
