import { supabase } from './supabase'

// Flag compartilhada: enquanto um cadastro está em andamento, o listener
// global de auth (AuthGate) não deve reagir — evita duas rotinas brigando
// pela mesma sessão e cancelando a criação da organização no meio do processo.
export const fluxoAuth = { emAndamento: false }

export const getSession = async () => {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session || null
}

// Eventos que não representam uma sessão nova/diferente — TOKEN_REFRESHED
// dispara sozinho em renovação automática em segundo plano, inclusive toda
// vez que a aba volta a ficar em foco. Reagir a eles reseta a tela inteira
// (AuthGate remonta o app) sem necessidade nenhuma — só reage a mudança de
// sessão de verdade (login/logout).
const EVENTOS_IGNORADOS = new Set(['TOKEN_REFRESHED', 'USER_UPDATED'])

export const onAuthChange = (callback) => {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (fluxoAuth.emAndamento) return
    if (EVENTOS_IGNORADOS.has(event)) return
    callback(session)
  })
  return () => data.subscription.unsubscribe()
}

export const signIn = async (email, password) => {
  if (!supabase) return { ok: false, error: 'Sem conexão' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, error: traduzErro(error.message) }
  return { ok: true }
}

export const signOut = async () => {
  if (!supabase) return
  await supabase.auth.signOut()
}

// Cria o usuário no Supabase Auth, depois cria a organização e vincula via RPC
export const signUpComOrganizacao = async ({ email, password, nomeOrg, slugOrg, onProgress }) => {
  if (!supabase) return { ok: false, error: 'Sem conexão' }

  fluxoAuth.emAndamento = true
  try {
    onProgress?.('conta')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) return { ok: false, error: traduzErro(signUpError.message) }

    // Usa a sessão retornada pelo próprio signUp — evita corrida com getSession() separado
    if (!signUpData?.session) {
      return { ok: false, error: 'Conta criada — confirme seu email antes de continuar.' }
    }

    onProgress?.('organizacao')
    const { error: rpcError } = await supabase.rpc('criar_organizacao', {
      p_slug: slugOrg,
      p_nome: nomeOrg,
    })
    if (rpcError) {
      if (rpcError.message?.includes('duplicate') || rpcError.message?.includes('unique')) {
        return { ok: false, error: 'Esse link (slug) já está em uso. Escolha outro.' }
      }
      if (rpcError.message?.includes('slug_invalido')) {
        return { ok: false, error: 'Link inválido. Use só letras minúsculas, números e hífen (3-40 caracteres).' }
      }
      return { ok: false, error: traduzErro(rpcError.message) }
    }

    onProgress?.('confirmando')
    return { ok: true }
  } finally {
    fluxoAuth.emAndamento = false
  }
}

// Busca a organização vinculada ao usuário logado
export const getOrgDoUsuario = async () => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id, role, organizacoes ( id, slug, nome, plano, ativo, responsavel_nome, razao_social, documento, documento_tipo, trial_fim, pago_ate, permite_dedicante_unidade, assinatura_status, cancelamento_solicitado_em )')
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  const o = data.organizacoes
  const cadastroCompleto = Boolean(o?.responsavel_nome?.trim() && o?.documento?.trim())
  const hoje = new Date().toISOString().slice(0, 10)
  const bloqueado = Boolean(o?.trial_fim && hoje > o.trial_fim && (!o?.pago_ate || hoje > o.pago_ate))
  return {
    orgId: data.org_id,
    role: data.role,
    // "Dedicante de unidade" é o único papel restrito hoje — qualquer outro
    // role (ex: 'admin', o da representante) tem acesso total, sem exceção.
    isDedicanteUnidade: data.role === 'dedicante_unidade',
    slug: o?.slug,
    nome: o?.nome,
    plano: o?.plano,
    ativo: o?.ativo,
    responsavelNome: o?.responsavel_nome || '',
    razaoSocial: o?.razao_social || '',
    documento: o?.documento || '',
    documentoTipo: o?.documento_tipo || '',
    cadastroCompleto,
    trialFim: o?.trial_fim || null,
    pagoAte: o?.pago_ate || null,
    bloqueado,
    permiteDedicanteUnidade: o?.permite_dedicante_unidade || false,
    assinaturaStatus: o?.assinatura_status || 'nunca_assinou',
    cancelamentoSolicitadoEm: o?.cancelamento_solicitado_em || null,
  }
}

/**
 * Unidades que o usuário logado representa — só relevante pra quem tem
 * role='dedicante_unidade'; pra role de acesso total, volta vazio (esse
 * papel enxerga todas as unidades, não precisa de lista nenhuma).
 */
export const getMinhasUnidades = async () => {
  if (!supabase) return []
  // Mesmas colunas que getUnidades() devolve pra representante (menos
  // pin_entrega — link de entrega por PIN não é algo que este papel restrito
  // deva enxergar), pra ModoPdv/PedidosScreen/EntregasScreen funcionarem
  // idêntico com qualquer uma das duas listas.
  const { data, error } = await supabase
    .from('org_member_unidades')
    .select('unidade_id, org_unidades ( id, nome, endereco, ordem, aberto )')
  if (error || !data) return []
  return data.map(r => r.org_unidades).filter(Boolean).sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
}

/**
 * Mesma lista de getMinhasUnidades(), só que com pin_entrega incluído — usada
 * só pelo card "Meus links" (Pedidos) que mostra o link de entrega por PIN da
 * própria unidade pro dedicante repassar. Continua batendo só nas unidades
 * dele (via org_member_unidades), nunca nas outras da organização — e ele não
 * consegue gerar/trocar o PIN por aqui, só ver o que a coordenadora já gerou
 * em Config → Unidades.
 */
export const getMinhasUnidadesComPin = async () => {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('org_member_unidades')
    .select('unidade_id, org_unidades ( id, nome, ordem, pin_entrega )')
  if (error || !data) return []
  return data.map(r => r.org_unidades).filter(Boolean).sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
}

// Sinaliza que a Dedicante quer cancelar a mensalidade — não cancela na hora,
// só registra o pedido. O acesso continua normal até pago_ate; quem efetiva
// o cancelamento é o gestor da plataforma, em /gestor.
export const solicitarCancelamentoAssinatura = async (orgId) => {
  if (!supabase) return { ok: false, error: 'Sem conexão' }
  const { error } = await supabase.rpc('solicitar_cancelamento_assinatura', { p_org_id: orgId })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// Salva nome do responsável / razão social / CPF-CNPJ — não bloqueia nada,
// só completa o cadastro pra eventual cobrança ou integração futura.
export const atualizarDadosOrganizacao = async (orgId, { responsavelNome, razaoSocial, documento, documentoTipo }) => {
  if (!supabase) return { ok: false, error: 'Sem conexão' }
  const { error } = await supabase.rpc('atualizar_dados_organizacao', {
    p_org_id: orgId,
    p_responsavel_nome: responsavelNome || null,
    p_razao_social: razaoSocial || null,
    p_documento: documento || null,
    p_documento_tipo: documentoTipo || null,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// Cria só a conta de autenticação, sem vincular a nenhuma organização —
// usado pelo painel do gestor da plataforma (que não é tenant de ninguém).
export const signUpSemOrganizacao = async (email, password) => {
  if (!supabase) return { ok: false, error: 'Sem conexão' }
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { ok: false, error: traduzErro(error.message) }
  if (!data?.session) return { ok: false, error: 'Conta criada — confirme seu email antes de continuar.' }
  return { ok: true }
}

// Checa se o usuário logado é dono da plataforma (tabela platform_admins,
// independente de qualquer organização/tenant)
export const isPlatformAdmin = async () => {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('is_platform_admin')
  if (error) return false
  return Boolean(data)
}

const traduzErro = (msg = '') => {
  if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.'
  if (msg.includes('User already registered')) return 'Esse email já tem conta. Faça login.'
  if (msg.includes('Password should be at least')) return 'Senha precisa ter no mínimo 6 caracteres.'
  return msg
}
