import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { getOrgDoUsuario, atualizarDadosOrganizacao } from './lib/auth'
import { criarCobranca, listarCobrancas } from './lib/asaas'

const fmt = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',')
const fmtData = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : ''
const soDigitos = s => (s || '').replace(/\D/g, '')

// Tela de acesso encerrado (trial acabou ou mensalidade não paga). O acesso vale
// até o fim do dia de pago_ate — a partir do dia seguinte cai aqui. Quem tem
// acesso total (representante) paga direto daqui; dedicante de unidade só é
// orientado a falar com o responsável. Servidor confere tudo de novo em
// api/asaas.js, isso aqui é só a experiência.
export default function TelaBloqueio({ org, onLiberado, onSair }) {
  const podePagar = !org.isDedicanteUnidade
  const fimAcesso = org.pagoAte || org.trialFim
  const [valor, setValor] = useState(null)
  const [link, setLink] = useState(null)
  const [carregando, setCarregando] = useState(podePagar)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  // Cadastro mínimo exigido pela cobrança (o servidor também exige)
  const [cadastroOk, setCadastroOk] = useState(org.cadastroCompleto)
  const [nome, setNome] = useState(org.responsavelNome || '')
  const [documento, setDocumento] = useState(org.documento || '')
  const [salvandoCadastro, setSalvandoCadastro] = useState(false)

  useEffect(() => {
    if (!podePagar) return
    let cancelado = false
    ;(async () => {
      const [cobrancas, unidades] = await Promise.all([
        listarCobrancas(org.orgId),
        supabase ? supabase.from('org_unidades').select('id', { count: 'exact', head: true }).eq('org_id', org.orgId) : { count: 1 },
      ])
      if (cancelado) return
      const extras = Math.max(0, (unidades?.count || 1) - 1)
      setValor(49.90 + extras * 9.90)
      const aberta = cobrancas.find(c => c.tipo === 'mensalidade' && ['pendente', 'vencido'].includes(c.status) && c.link_pagamento)
      if (aberta) setLink(aberta.link_pagamento)
      setCarregando(false)
    })()
    return () => { cancelado = true }
  }, [org.orgId, podePagar])

  // Com o pagamento em andamento, confere de tempos em tempos se o webhook já
  // liberou o acesso — quando liberar, entra no sistema sozinho.
  useEffect(() => {
    if (!link) return
    const confere = async () => {
      const o = await getOrgDoUsuario()
      if (o && !o.bloqueado) onLiberado()
    }
    const id = setInterval(confere, 6000)
    window.addEventListener('focus', confere)
    return () => { clearInterval(id); window.removeEventListener('focus', confere) }
  }, [link])

  const salvarCadastro = async () => {
    const doc = soDigitos(documento)
    if (!nome.trim()) { setErro('Informe seu nome completo'); return false }
    if (doc.length !== 11 && doc.length !== 14) { setErro('CPF precisa ter 11 números ou CNPJ 14 números'); return false }
    setSalvandoCadastro(true)
    const r = await atualizarDadosOrganizacao(org.orgId, {
      responsavelNome: nome.trim(),
      razaoSocial: '',
      documento: doc,
      documentoTipo: doc.length === 14 ? 'cnpj' : 'cpf',
    })
    setSalvandoCadastro(false)
    if (!r.ok) { setErro('Erro ao salvar: ' + r.error); return false }
    setCadastroOk(true)
    return true
  }

  const pagar = async () => {
    setErro('')
    if (!cadastroOk && !(await salvarCadastro())) return
    setGerando(true)
    const r = await criarCobranca('mensalidade')
    setGerando(false)
    if (!r.ok) { setErro(r.error); return }
    setLink(r.link)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-50 px-6 py-8">
      <div className="text-center max-w-sm w-full">
        <div className="text-4xl mb-3">🔒</div>
        <div className="text-stone-800 font-black text-xl mb-2">Acesso encerrado</div>
        <p className="text-stone-500 text-sm mb-1">
          O acesso do <strong>{org.nome}</strong> terminou em {fmtData(fimAcesso)}.
        </p>

        {!podePagar ? (
          <p className="text-stone-500 text-sm mb-6">Avise o responsável pelo grupo para regularizar a mensalidade.</p>
        ) : carregando ? (
          <p className="text-stone-400 text-sm my-6">Carregando…</p>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 my-5 text-left space-y-3">
            <div>
              <div className="text-xs font-black tracking-widest uppercase text-stone-400">Mensalidade</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-stone-800">{fmt(valor)}</span>
                <span className="text-sm text-stone-400">por mês</span>
              </div>
            </div>

            {link ? (
              <>
                <a href={link} target="_blank" rel="noopener noreferrer"
                  className="block text-center w-full py-3.5 bg-green-700 text-white rounded-xl font-black text-sm active:bg-green-800">
                  Abrir pagamento (Pix, boleto ou cartão)
                </a>
                <p className="text-xs text-stone-400 text-center">
                  Depois de pagar, volte para esta tela. O acesso é liberado sozinho assim que o pagamento for confirmado.
                </p>
              </>
            ) : (
              <>
                {!cadastroOk && (
                  <div className="space-y-2">
                    <p className="text-xs text-stone-500">Para gerar a cobrança, confirme seus dados:</p>
                    <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-green-500" />
                    <input value={documento} onChange={e => setDocumento(e.target.value)} inputMode="numeric" placeholder="CPF ou CNPJ"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-green-500" />
                  </div>
                )}
                <button onClick={pagar} disabled={gerando || salvandoCadastro}
                  className="w-full py-3.5 bg-green-700 text-white rounded-xl font-black text-sm active:bg-green-800 disabled:opacity-50">
                  {gerando || salvandoCadastro ? '⟳ Gerando...' : 'Pagar mensalidade'}
                </button>
              </>
            )}
            {erro && <div className="text-sm text-red-600 font-semibold">{erro}</div>}
          </div>
        )}

        <a href="https://wa.me/5511957737933" target="_blank" rel="noopener noreferrer"
          className="inline-block text-sm text-green-700 font-bold underline">
          Falar no WhatsApp
        </a>
        <button onClick={onSair} className="block w-full text-center text-xs text-stone-400 mt-5 underline">Sair</button>
      </div>
    </div>
  )
}
