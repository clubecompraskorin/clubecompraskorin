import { supabase } from './supabase'

export const getSession = async () => {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session || null
}

export const onAuthChange = (callback) => {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
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

  onProgress?.('conta')
  const { error: signUpError } = await supabase.auth.signUp({ email, password })
  if (signUpError) return { ok: false, error: traduzErro(signUpError.message) }

  // signUp já autentica a sessão (confirmação de email desativada) — confirma:
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session) {
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
}

// Busca a organização vinculada ao usuário logado
export const getOrgDoUsuario = async () => {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id, role, organizacoes ( id, slug, nome, plano, ativo )')
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return {
    orgId: data.org_id,
    role: data.role,
    slug: data.organizacoes?.slug,
    nome: data.organizacoes?.nome,
    plano: data.organizacoes?.plano,
    ativo: data.organizacoes?.ativo,
  }
}

const traduzErro = (msg = '') => {
  if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.'
  if (msg.includes('User already registered')) return 'Esse email já tem conta. Faça login.'
  if (msg.includes('Password should be at least')) return 'Senha precisa ter no mínimo 6 caracteres.'
  return msg
}
