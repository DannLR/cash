import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CashLogo from '../components/CashLogo';
import { useTema } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen({ modoRedefinicao = false }) {
  const { cores, modoEscuro } = useTema();
  const { entrar, cadastrar, recuperacaoSenha, solicitarRedefinicaoSenha, atualizarSenha } = useAuth();
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web' && width >= 768;
  const [modoCadastro, setModoCadastro] = useState(false);
  const [modoRecuperacaoLocal, setModoRecuperacaoLocal] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const redefinindo = modoRedefinicao || recuperacaoSenha;

  async function enviar() {
    setErro('');
    setMensagem('');
    if ((!redefinindo && !email.trim()) || (!modoRecuperacaoLocal && !senha)) {
      setErro(modoRecuperacaoLocal ? 'Informe seu e-mail.' : 'Informe seu e-mail e sua senha.');
      return;
    }
    if ((modoCadastro || redefinindo) && senha.length < 8 && !modoRecuperacaoLocal) {
      setErro('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setEnviando(true);
    try {
      if (redefinindo) {
        await atualizarSenha(senha);
        setMensagem('Senha atualizada. Você já pode continuar usando o Cash.');
        setSenha('');
      } else if (modoRecuperacaoLocal) {
        await solicitarRedefinicaoSenha(email);
        setMensagem('Enviamos um link de redefinição para seu e-mail.');
      } else if (modoCadastro) {
        const data = await cadastrar(email, senha);
        if (!data.session) {
          setMensagem('Cadastro criado. Confira seu e-mail para confirmar a conta e depois entre no Cash.');
        }
      } else {
        await entrar(email, senha);
      }
    } catch (e) {
      const mensagemErro = e?.message || 'Não foi possível concluir. Tente novamente.';
      setErro(mensagemErro.includes('Invalid login credentials')
        ? 'E-mail ou senha incorretos.'
        : mensagemErro.includes('Email not confirmed')
          ? 'Confirme seu e-mail antes de entrar.'
          : mensagemErro);
    } finally {
      setEnviando(false);
    }
  }

  const painel = (
    <View style={[styles.painel, web && styles.painelWeb, { backgroundColor: cores.card, borderColor: cores.borda }]}>
      <CashLogo size={46} />
      <Text style={[styles.titulo, { color: cores.texto }]}>{redefinindo ? 'Nova senha' : modoRecuperacaoLocal ? 'Recuperar senha' : modoCadastro ? 'Crie sua conta' : 'Acesse seu Cash'}</Text>
      <Text style={[styles.subtitulo, { color: cores.textoSecundario }]}>
        {redefinindo ? 'Escolha uma nova senha para sua conta.' : modoRecuperacaoLocal ? 'Enviaremos um link seguro para redefinir sua senha.' : modoCadastro ? 'Seus dados ficarão sincronizados entre o site e o app.' : 'Entre para acessar seus dados em qualquer dispositivo.'}
      </Text>

      {!redefinindo && <><Text style={[styles.rotulo, { color: cores.textoSecundario }]}>E-mail</Text>
      <TextInput
        style={[styles.input, { color: cores.texto, borderColor: cores.borda, backgroundColor: cores.fundo }]}
        value={email}
        onChangeText={setEmail}
        placeholder="voce@exemplo.com"
        placeholderTextColor={cores.textoSecundario}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      /></>}
      {!modoRecuperacaoLocal && <><Text style={[styles.rotulo, { color: cores.textoSecundario }]}>{redefinindo ? 'Nova senha' : 'Senha'}</Text>
      <TextInput
        style={[styles.input, { color: cores.texto, borderColor: cores.borda, backgroundColor: cores.fundo }]}
        value={senha}
        onChangeText={setSenha}
        placeholder={modoCadastro || redefinindo ? 'Pelo menos 8 caracteres' : 'Sua senha'}
        placeholderTextColor={cores.textoSecundario}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={modoCadastro || redefinindo ? 'new-password' : 'current-password'}
        textContentType={modoCadastro || redefinindo ? 'newPassword' : 'password'}
        onSubmitEditing={enviar}
      /></>}

      {!!erro && <Text style={styles.erro}>{erro}</Text>}
      {!!mensagem && <Text style={styles.mensagem}>{mensagem}</Text>}

      <TouchableOpacity style={[styles.botao, { backgroundColor: cores.primario }]} onPress={enviar} disabled={enviando} activeOpacity={0.85}>
        {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>{redefinindo ? 'Atualizar senha' : modoRecuperacaoLocal ? 'Enviar link' : modoCadastro ? 'Criar conta' : 'Entrar'}</Text>}
      </TouchableOpacity>

      {!redefinindo && !modoRecuperacaoLocal && !modoCadastro && <TouchableOpacity onPress={() => { setModoRecuperacaoLocal(true); setErro(''); setMensagem(''); }} style={styles.acaoSenha}><Text style={[styles.acaoSenhaTexto, { color: cores.primario }]}>Esqueci minha senha</Text></TouchableOpacity>}
      {!redefinindo && !modoRecuperacaoLocal && <TouchableOpacity onPress={() => { setModoCadastro((atual) => !atual); setErro(''); setMensagem(''); }} style={styles.trocarModo}>
        <Text style={[styles.trocarModoTexto, { color: cores.textoSecundario }]}>
          {modoCadastro ? 'Já tem uma conta? ' : 'Ainda não tem conta? '}
          <Text style={{ color: cores.primario, fontWeight: '700' }}>{modoCadastro ? 'Entrar' : 'Criar conta'}</Text>
        </Text>
      </TouchableOpacity>}
      {modoRecuperacaoLocal && <TouchableOpacity onPress={() => { setModoRecuperacaoLocal(false); setErro(''); setMensagem(''); }} style={styles.trocarModo}><Text style={[styles.trocarModoTexto, { color: cores.primario }]}>Voltar para entrar</Text></TouchableOpacity>}
      <View style={styles.selo}><Ionicons name="sync-outline" size={14} color={cores.primario} /><Text style={[styles.seloTexto, { color: cores.textoSecundario }]}>Sincronização segura entre dispositivos</Text></View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.conteudo, web && styles.conteudoWeb]} keyboardShouldPersistTaps="handled">
          {web && <View style={[styles.destaque, { backgroundColor: modoEscuro ? '#33264A' : '#D7C4F4' }]}>
            <Text style={[styles.destaqueKicker, { color: modoEscuro ? '#D8C4F5' : '#684A91' }]}>SUAS FINANÇAS, EM EQUILÍBRIO</Text>
            <Text style={[styles.destaqueTitulo, { color: cores.texto }]}>Um plano claro para o seu dinheiro.</Text>
            <Text style={[styles.destaqueTexto, { color: cores.textoSecundario }]}>Acesse suas contas, organize compromissos e acompanhe suas metas em qualquer lugar.</Text>
          </View>}
          {painel}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  conteudoWeb: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36, maxWidth: 1100, width: '100%', alignSelf: 'center', paddingVertical: 48 },
  destaque: { flex: 1, minHeight: 350, maxWidth: 540, borderRadius: 26, padding: 36, justifyContent: 'center' },
  destaqueKicker: { fontSize: 11, letterSpacing: 1.6, fontWeight: '700', marginBottom: 14 },
  destaqueTitulo: { fontSize: 32, lineHeight: 39, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' },
  destaqueTexto: { fontSize: 15, lineHeight: 23, marginTop: 14, maxWidth: 400 },
  painel: { width: '100%', maxWidth: 430, alignSelf: 'center', borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'stretch' },
  painelWeb: { padding: 32 },
  titulo: { fontSize: 24, fontWeight: '700', marginTop: 20, fontFamily: 'Space Grotesk, sans-serif' },
  subtitulo: { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 24 },
  rotulo: { fontSize: 12, marginBottom: 6, marginTop: 12 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, outlineStyle: 'none' },
  botao: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  botaoTexto: { color: '#fff', fontSize: 14, fontWeight: '700' },
  erro: { fontSize: 12, color: '#DC2626', marginTop: 12, lineHeight: 18 },
  mensagem: { fontSize: 12, color: '#16803C', marginTop: 12, lineHeight: 18 },
  trocarModo: { alignItems: 'center', paddingVertical: 18 },
  acaoSenha: { alignSelf: 'flex-end', paddingTop: 12 },
  acaoSenhaTexto: { fontSize: 12, fontWeight: '600' },
  trocarModoTexto: { fontSize: 12 },
  selo: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' },
  seloTexto: { fontSize: 11 },
});
