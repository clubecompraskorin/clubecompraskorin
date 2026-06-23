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

export const onAuthChange = (callback) => {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (fluxoAuth.emAndamento) return
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
    .select('org_id, role, organizacoes ( id, slug, nome, plano, ativo, responsavel_nome, razao_social, documento, documento_tipo )')
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  const o = data.organizacoes
  const cadastroCompleto = Boolean(o?.responsavel_nome?.trim() && o?.documento?.trim())
  return {
    orgId: data.org_id,
    role: data.role,
    slug: o?.slug,
    nome: o?.nome,
    plano: o?.plano,
    ativo: o?.ativo,
    responsavelNome: o?.responsavel_nome || '',
    razaoSocial: o?.razao_social || '',
    documento: o?.documento || '',
    documentoTipo: o?.documento_tipo || '',
    cadastroCompleto,
  }
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
