import React, { useState } from 'react';
import { SafeAreaView, KeyboardAvoidingView, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { atualizarDadosCartao } from '../database/queries';
import { useTema } from '../context/ThemeContext';
import WebPageHeader from '../components/WebPageHeader';
import PageIntro from '../components/PageIntro';
import { parseValorMoeda } from '../utils/moeda';

function formatarValor(texto) { const digitos = texto.replace(/\D/g, ''); return digitos ? (parseInt(digitos, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''; }
export default function EditCardScreen({ navigation, route }) {
  const { cores } = useTema();
  const web = Platform.OS === 'web';
  const { cartao } = route.params; const [limite, setLimite] = useState((cartao.limite || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })); const [salvando, setSalvando] = useState(false);
  const podeSalvar = limite && parseValorMoeda(limite) >= 0 && !salvando;
  async function salvar() { if (!podeSalvar) return; setSalvando(true); try { await atualizarDadosCartao(cartao.id, { limite: parseValorMoeda(limite), diaVencimento: cartao.dia_vencimento, diaFechamento: cartao.dia_fechamento }); navigation.goBack(); } finally { setSalvando(false); } }
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <KeyboardAvoidingView style={[styles.conteudo, web && styles.webConteudo]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={web ? styles.webShell : styles.mobileShell}>
          {web ? (
            <>
              <WebPageHeader acaoTexto="Voltar ao cartão" acaoIcone="arrow-back" aoAcionar={() => navigation.goBack()} />
              <PageIntro kicker="LIMITES E FATURAS" titulo="Editar cartão" subtitulo={`Atualize o limite disponível de ${cartao.apelido}.`} cores={cores} />
            </>
          ) : (
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={24} color={cores.texto} /></TouchableOpacity>
              <Text style={[styles.titulo, { color: cores.texto }]}>Limite do cartão</Text>
              <View style={{ width: 24 }} />
            </View>
          )}
          <View style={[styles.formPanel, web && styles.webPanel, web && { backgroundColor: cores.card }]}>
            <Text style={[styles.label, { color: cores.texto }]}>Limite disponível</Text>
            <Text style={[styles.ajuda, { color: cores.textoSecundario }]}>Informe o limite total disponível no cartão.</Text>
            <View style={[styles.valorLinha, web && styles.webValorLinha, { borderColor: cores.borda, backgroundColor: cores.card }]}>
              <Text style={[styles.prefixo, { color: cores.textoSecundario }]}>R$</Text>
              <TextInput style={[styles.input, { color: cores.texto, backgroundColor: cores.card }]} value={limite} onChangeText={(texto) => setLimite(formatarValor(texto))} keyboardType="number-pad" autoFocus />
            </View>
            {web ? (
              <View style={styles.webAcoes}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.botao, styles.webBotaoSecundario, { borderColor: cores.borda }]}>
                  <Text style={[styles.webBotaoSecundarioTexto, { color: cores.texto }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botao, styles.webBotao, { backgroundColor: cores.primario }, !podeSalvar && styles.webDesabilitado]} disabled={!podeSalvar} onPress={salvar}>
                  <Text style={styles.botaoTexto}>{salvando ? 'Salvando...' : 'Salvar limite'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.botao, { backgroundColor: cores.primario }, !podeSalvar && styles.desabilitado]} disabled={!podeSalvar} onPress={salvar}>
                <Text style={styles.botaoTexto}>{salvando ? 'Salvando...' : 'Salvar limite'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 }, conteudo: { flex: 1, padding: 16 }, webConteudo: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 24 },
  mobileShell: { flex: 1 }, webShell: { flex: 1, width: '100%', maxWidth: 1180, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }, titulo: { fontSize: 16, fontWeight: '600' },
  formPanel: { flex: 1, paddingTop: 32 }, webPanel: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%', height: 220, maxWidth: 960, alignSelf: 'center', borderRadius: 20, padding: 24, marginTop: 2 },
  label: { fontSize: 14, fontWeight: '600' }, ajuda: { fontSize: 13, marginTop: 5 },
  valorLinha: { height: 52, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 7 }, webValorLinha: { height: 44, borderRadius: 9, marginTop: 12 }, prefixo: { fontSize: 18 }, input: { flex: 1, fontSize: 20, fontWeight: '600', padding: 0 },
  botao: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, webAcoes: { flexDirection: 'row', gap: 8, marginTop: 18 }, webBotao: { flex: 1, height: 42, paddingHorizontal: 20 }, webBotaoSecundario: { flex: 1, height: 42, paddingHorizontal: 20, borderWidth: 1, backgroundColor: 'transparent' }, webBotaoSecundarioTexto: { fontSize: 14, fontWeight: '500' }, desabilitado: { backgroundColor: '#B7D3D0' }, webDesabilitado: { backgroundColor: '#B9A5D8' }, botaoTexto: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
