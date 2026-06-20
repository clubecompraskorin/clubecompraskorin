import { useState } from 'react'
import { signIn, signUpComOrganizacao } from './lib/auth'

const slugify = (s) => s
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .slice(0, 40)

const ETAPAS = [
  { id: 'conta', label: 'Criando sua conta' },
  { id: 'organizacao', label: 'Configurando seu grupo' },
  { id: 'confirmando', label: 'Quase lá' },
]

export default function Login({ onSuccess }) {
  const [modo, setModo] = useState('login') // login | cadastro
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nomeOrg, setNomeOrg] = useState('')
  const [slugOrg, setSlugOrg] = useState('')
  const [slugEditado, setSlugEditado] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [etapaAtual, setEtapaAtual] = useState(null)

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
      if (!r.ok) { setCarregando(false); return setErro(r.error) }
      setEtapaAtual('confirmando')
      await onSuccess()
      setCarregando(false)
      return
    }

    if (!nomeOrg.trim() || !slugOrg.trim()) {
      setCarregando(false)
      return setErro('Preencha o nome do seu clube/grupo.')
    }
    const r = await signUpComOrganizacao({ email, password, nomeOrg, slugOrg, onProgress: setEtapaAtual })
    if (!r.ok) { setCarregando(false); setEtapaAtual(null); return setErro(r.error) }
    await onSuccess()
    setCarregando(false)
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

          {carregando && modo === 'cadastro' && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-3 space-y-1.5">
              {ETAPAS.map((etapa, i) => {
                const idxAtual = ETAPAS.findIndex(e => e.id === etapaAtual)
                const status = i < idxAtual ? 'feita' : i === idxAtual ? 'ativa' : 'pendente'
                return (
                  <div key={etapa.id} className="flex items-center gap-2 text-xs">
                    <span className={
                      status === 'feita' ? 'text-green-600' :
                      status === 'ativa' ? 'text-green-700 animate-pulse' : 'text-stone-300'
                    }>
                      {status === 'feita' ? '✓' : status === 'ativa' ? '●' : '○'}
                    </span>
                    <span className={status === 'pendente' ? 'text-stone-400' : 'text-green-800 font-bold'}>
                      {etapa.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

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
