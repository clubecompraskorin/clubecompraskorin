import { useEffect, useRef, useState } from 'react'
import { PASSOS_GUIA } from './lib/onboardingSteps'

const display = { fontFamily: "'Space Grotesk', sans-serif" }
const mono = { fontFamily: "'JetBrains Mono', monospace" }

const REDUZIR_MOVIMENTO = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function GuiaTour({ aberto, onFechar }) {
  const [passo, setPasso] = useState(0)
  const [textoVisivel, setTextoVisivel] = useState('')
  const intervaloRef = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const texto = PASSOS_GUIA[passo].texto
    clearInterval(intervaloRef.current)

    if (REDUZIR_MOVIMENTO) {
      setTextoVisivel(texto)
      return
    }

    setTextoVisivel('')
    let i = 0
    intervaloRef.current = setInterval(() => {
      i += 2
      setTextoVisivel(texto.slice(0, i))
      if (i >= texto.length) clearInterval(intervaloRef.current)
    }, 12)
    return () => clearInterval(intervaloRef.current)
  }, [passo, aberto])

  useEffect(() => {
    if (!aberto) return
    setPasso(0)
    const aoTeclar = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto, onFechar])

  if (!aberto) return null

  const p = PASSOS_GUIA[passo]
  const ultimo = passo === PASSOS_GUIA.length - 1

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#14241B]/60 backdrop-blur-sm"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label="Guia passo a passo do Clube Unido"
    >
      <div className="min-h-full flex items-center justify-center px-4 py-6">
        <div
          className="relative w-full max-w-3xl bg-[#F6F2EA] rounded-[28px] shadow-2xl shadow-[#0F3D24]/30 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onFechar}
            aria-label="Fechar guia"
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#14241B]/60 hover:text-[#14241B] flex items-center justify-center transition-colors"
          >
            ✕
          </button>

          <div className="grid md:grid-cols-2 gap-0">
          {/* AVATAR + CHAT */}
          <div className="p-5 sm:p-7 md:p-9 flex flex-col">
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-11 h-11 rounded-full bg-[#1A5C38] text-white flex items-center justify-center font-semibold flex-shrink-0"
                style={display}
              >
                CU
              </div>
              <div>
                <div className="text-sm font-semibold text-[#14241B]">Guia do Clube Unido</div>
                <div className="text-xs text-[#14241B]/50" style={mono}>passo {p.n} de {String(PASSOS_GUIA.length).padStart(2, '0')}</div>
              </div>
            </div>

            <div className="mt-5 bg-white rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm border border-[#14241B]/5 min-h-[100px] sm:min-h-[132px]">
              <div className="font-semibold text-[#14241B]" style={display}>{p.titulo}</div>
              <p className="mt-2 text-[0.95rem] text-[#14241B]/75 leading-relaxed">
                {textoVisivel}
                {!REDUZIR_MOVIMENTO && textoVisivel.length < p.texto.length && (
                  <span className="inline-block w-[2px] h-[1em] bg-[#1A5C38]/50 align-middle ml-0.5 animate-pulse" />
                )}
              </p>
            </div>

            {/* progresso */}
            <div className="flex items-center gap-1.5 mt-6">
              {PASSOS_GUIA.map((s, i) => (
                <button
                  key={s.n}
                  onClick={() => setPasso(i)}
                  aria-label={`Ir para o passo ${s.n}`}
                  className={`h-1.5 rounded-full transition-all ${i === passo ? 'w-6 bg-[#1A5C38]' : 'w-1.5 bg-[#1A5C38]/20 hover:bg-[#1A5C38]/40'}`}
                />
              ))}
            </div>

            <div className="mt-auto pt-7 flex items-center gap-3">
              <button
                onClick={() => setPasso((n) => Math.max(0, n - 1))}
                disabled={passo === 0}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#1A5C38] border border-[#1A5C38]/25 hover:bg-[#1A5C38]/5 transition-colors disabled:opacity-0 disabled:pointer-events-none"
              >
                ← Voltar
              </button>
              {ultimo ? (
                <a
                  href="/painel"
                  className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#1A5C38] text-white hover:bg-[#0F3D24] transition-colors"
                >
                  Criar minha conta →
                </a>
              ) : (
                <button
                  onClick={() => setPasso((n) => Math.min(PASSOS_GUIA.length - 1, n + 1))}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#1A5C38] text-white hover:bg-[#0F3D24] transition-colors"
                >
                  Próximo passo →
                </button>
              )}
            </div>
          </div>

          {/* TELA MOCKADA */}
          <div className="bg-[#EFEAE0] flex items-center justify-center p-5 sm:p-7 md:p-9">
            <div className="w-full max-w-[200px] sm:max-w-[280px] bg-white rounded-2xl shadow-xl shadow-[#0F3D24]/15 overflow-hidden border border-[#14241B]/5">
              <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#F6F2EA] border-b border-[#14241B]/5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#14241B]/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#14241B]/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#14241B]/15" />
              </div>
              <img
                key={p.img}
                src={p.img}
                alt={p.alt}
                className={`w-full h-auto block ${REDUZIR_MOVIMENTO ? '' : 'animate-[fadeIn_.35s_ease]'}`}
              />
            </div>
          </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
