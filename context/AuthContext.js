import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [recuperacaoSenha, setRecuperacaoSenha] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function abrirLinkDeAutenticacao(url) {
      if (!url || Platform.OS === 'web') return;
      const partes = url.split(/[?#]/).slice(1).join('&');
      const parametros = new URLSearchParams(partes);
      if (parametros.get('type') === 'recovery') setRecuperacaoSenha(true);
      const accessToken = parametros.get('access_token');
      const refreshToken = parametros.get('refresh_token');
      if (!accessToken || !refreshToken) return;
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) console.warn('Não foi possível confirmar a conta pelo link:', error.message);
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.warn('Não foi possível recuperar a sessão:', error.message);
      if (ativo) {
        setSession(data?.session || null);
        setCarregando(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      if (ativo) setSession(novaSessao);
      if (evento === 'PASSWORD_RECOVERY') setRecuperacaoSenha(true);
    });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => abrirLinkDeAutenticacao(url));
    Linking.getInitialURL().then(abrirLinkDeAutenticacao).catch(() => {});
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const entrar = useCallback(async (email, senha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) throw error;
    return data;
  }, []);

  const cadastrar = useCallback(async (email, senha) => {
    const emailRedirectTo = Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? window.location.origin : undefined)
      : 'cash://auth/callback';
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { emailRedirectTo },
    });
    if (error) throw error;
    return data;
  }, []);

  const solicitarRedefinicaoSenha = useCallback(async (email) => {
    const redirectTo = Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? window.location.origin : undefined)
      : 'cash://auth/callback';
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw error;
  }, []);

  const atualizarSenha = useCallback(async (senha) => {
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) throw error;
    setRecuperacaoSenha(false);
  }, []);

  const sair = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setRecuperacaoSenha(false);
  }, []);

  const value = useMemo(() => ({ session, usuario: session?.user || null, carregando, recuperacaoSenha, entrar, cadastrar, solicitarRedefinicaoSenha, atualizarSenha, sair }), [session, carregando, recuperacaoSenha, entrar, cadastrar, solicitarRedefinicaoSenha, atualizarSenha, sair]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa ser usado dentro de AuthProvider.');
  return value;
}
