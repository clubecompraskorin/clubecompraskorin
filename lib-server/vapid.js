// Configuração do Web Push (VAPID) usada por api/pedido.js e api/membros.js.
// Fica fora de api/ pra não contar como mais uma Serverless Function (limite de 12 no Hobby).
import crypto from 'crypto'

// Aceita a chave com espaço/quebra de linha, base64 comum (+ /) ou com padding (=) e devolve
// base64 "URL safe" sem padding, que é o que o web-push exige.
const normalizar = (s) => (s || '').replace(/\s+/g, '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// A chave pública é DERIVADA da privada: assim as duas nunca ficam dessincronizadas (uma
// VAPID_PUBLIC_KEY velha no Vercel era a causa de "push desativado"). Devolve true se ficou ativo.
export function configurarVapid(webpush, assunto) {
  const privada = normalizar(process.env.VAPID_PRIVATE_KEY)
  if (!privada) return false
  try {
    const ecdh = crypto.createECDH('prime256v1')
    ecdh.setPrivateKey(Buffer.from(privada.replace(/-/g, '+').replace(/_/g, '/'), 'base64'))
    const publica = normalizar(ecdh.getPublicKey().toString('base64'))
    webpush.setVapidDetails(assunto, publica, privada)

    // O app (navegador) se inscreve com VITE_VAPID_PUBLIC_KEY: se não for a par da privada, o
    // aviso é aceito na inscrição mas o envio falha. Só registra o alerta, nunca o valor.
    const doApp = normalizar(process.env.VITE_VAPID_PUBLIC_KEY)
    if (doApp && doApp !== publica) {
      console.error('VAPID: VITE_VAPID_PUBLIC_KEY não é a par de VAPID_PRIVATE_KEY — inscrições feitas com ela não vão receber push')
    }
    return true
  } catch (e) {
    console.error('VAPID setup falhou — push desativado:', e.message)
    return false
  }
}
