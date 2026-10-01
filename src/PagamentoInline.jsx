import { useState, useEffect } from 'react'
import { pagamentoNaTela, listarCobrancas } from './lib/asaas'

const fmt = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',')
const fmtData = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : ''

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true } catch {}
  try {
    const t = document.createElement('textarea')
    t.value = texto; t.style.position = 'fixed'; t.style.opacity = '0'
    document.body.appendChild(t); t.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(t)
    return ok
  } catch { return false }
}

// Pagamento dentro da tela: Pix (QR Code + copia e cola) ou boleto (linha
// digitável). Confere a cada 5s se a cobrança foi paga e avisa quem chamou. Se
// o Asaas não gerar aqui, sempre sobra o link da página do Asaas (cartão incluso).
export default function PagamentoInline({ orgId, cobrancaId, link, onPago }) {
  const [forma, setForma] = useState('PIX')
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let cancelado = false
    setCarregando(true); setErro(''); setDados(null)
    pagamentoNaTela(cobrancaId, forma).then(r => {
      if (cancelado) return
      setCarregando(false)
      if (!r.ok) { setErro(r.error || 'Não foi possível gerar o pagamento'); return }
      if (r.pago) { onPago?.(); return }
      setDados(r)
    })
    return () => { cancelado = true }
  }, [cobrancaId, forma])

  useEffect(() => {
    if (!orgId || !cobrancaId) return
    const confere = async () => {
      const lista = await listarCobrancas(orgId)
      if (lista.find(c => c.asaas_charge_id === cobrancaId && c.status === 'pago')) onPago?.()
    }
    const id = setInterval(confere, 5000)
    return () => clearInterval(id)
  }, [orgId, cobrancaId])

  const copia = async (texto) => {
    if (await copiar(texto)) { setCopiado(true); setTimeout(() => setCopiado(false), 2500) }
  }

  const aba = (f, rotulo) => (
    <button onClick={() => setForma(f)}
      className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-colors ${forma === f ? 'bg-green-700 text-white' : 'bg-stone-100 text-stone-500'}`}>
      {rotulo}
    </button>
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">{aba('PIX', 'Pix')}{aba('BOLETO', 'Boleto')}</div>

      {carregando && <div className="text-center text-sm text-stone-400 py-8">⟳ Gerando…</div>}

      {!carregando && erro && (
        <div className="text-sm text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-3">
          {erro}
          <div className="text-xs font-normal text-red-500 mt-1">Use o botão abaixo para pagar pela página do Asaas.</div>
        </div>
      )}

      {!carregando && dados?.forma === 'PIX' && (
        <div className="text-center space-y-3">
          <div className="text-sm text-stone-500">
            Pague <strong className="text-stone-800">{fmt(dados.valor)}</strong> pelo app do seu banco
          </div>
          {dados.encodedImage && (
            <img src={`data:image/png;base64,${dados.encodedImage}`} alt="QR Code Pix"
              className="mx-auto w-48 h-48 rounded-xl border border-stone-100 bg-white p-2" />
          )}
          <button onClick={() => copia(dados.payload)}
            className="w-full py-3 bg-stone-800 text-white rounded-xl font-black text-sm active:bg-stone-900">
            {copiado ? '✅ Código copiado!' : 'Copiar código Pix (copia e cola)'}
          </button>
          <p className="text-xs text-stone-400">
            No app do banco: Pix → Pix Copia e Cola → colar. A confirmação aparece aqui em segundos.
          </p>
        </div>
      )}

      {!carregando && dados?.forma === 'BOLETO' && (
        <div className="space-y-3">
          <div className="text-sm text-stone-500 text-center">
            Boleto de <strong className="text-stone-800">{fmt(dados.valor)}</strong> · vence em {fmtData(dados.vencimento)}
          </div>
          <div className="bg-stone-50 border border-stone-100 rounded-xl px-3 py-3 text-sm font-mono text-stone-700 break-all text-center">
            {dados.linhaDigitavel}
          </div>
          <button onClick={() => copia(dados.linhaDigitavel)}
            className="w-full py-3 bg-stone-800 text-white rounded-xl font-black text-sm active:bg-stone-900">
            {copiado ? '✅ Linha copiada!' : 'Copiar linha digitável'}
          </button>
          {dados.boletoUrl && (
            <a href={dados.boletoUrl} target="_blank" rel="noopener noreferrer"
              className="block text-center w-full py-3 bg-stone-100 text-stone-700 rounded-xl font-black text-sm">
              Baixar boleto (PDF)
            </a>
          )}
          <p className="text-xs text-stone-400 text-center">
            Boleto leva até 1 dia útil para compensar. Para liberar na hora, use o Pix.
          </p>
        </div>
      )}

      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer"
          className="block text-center text-xs text-stone-400 underline">
          Prefere cartão ou outra forma? Abrir página do Asaas
        </a>
      )}
    </div>
  )
}
