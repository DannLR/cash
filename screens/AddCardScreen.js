import React, { useState } from 'react';
import { SafeAreaView, KeyboardAvoidingView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { salvarCartao } from '../database/queries';
import { useTema } from '../context/ThemeContext';
import WebPageHeader from '../components/WebPageHeader';
import PageIntro from '../components/PageIntro';
import { parseValorMoeda } from '../utils/moeda';

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'Hipercard', 'Outro'];
function formatarValor(texto) { const digitos = texto.replace(/\D/g, ''); return digitos ? (parseInt(digitos, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''; }

export default function AddCardScreen({ navigation }) {
  const { cores } = useTema();
  const web = Platform.OS === 'web';
  const [apelido, setApelido] = useState(''); const [bandeira, setBandeira] = useState('Visa'); const [ultimosDigitos, setUltimosDigitos] = useState(''); const [limite, setLimite] = useState(''); const [diaVencimento, setDiaVencimento] = useState(''); const [diaFechamento, setDiaFechamento] = useState(''); const [salvando, setSalvando] = useState(false);
  const diaValido = (dia) => parseInt(dia, 10) >= 1 && parseInt(dia, 10) <= 31;
  const podeSalvar = apelido.trim() && limite && diaValido(diaVencimento) && diaValido(diaFechamento) && !salvando;
  async function salvar() { if (!podeSalvar) return; setSalvando(true); try { await salvarCartao({ apelido: apelido.trim(), bandeira, ultimosDigitos: ultimosDigitos.replace(/\D/g, '').slice(-4), limite: parseValorMoeda(limite), diaVencimento: parseInt(diaVencimento, 10), diaFechamento: parseInt(diaFechamento, 10) }); navigation.goBack(); } finally { setSalvando(false); } }
  const camposCartao = (
    <>
      <View style={web && styles.webCamposColuna}>
        <View>
          <Text style={[styles.label, web && styles.webLabel, { color: cores.textoSecundario }]}>Apelido</Text>
          <TextInput style={[styles.input, web && styles.webInput, { borderColor: cores.borda, color: cores.texto, backgroundColor: cores.card }]} placeholder="Ex: Nubank, Itaú" value={apelido} onChangeText={setApelido} autoFocus />
        </View>
        <View>
          <Text style={[styles.label, web && styles.webLabel, { color: cores.textoSecundario }]}>Últimos 4 dígitos <Text style={styles.opcional}>(opcional)</Text></Text>
          <TextInput style={[styles.input, web && styles.webInput, { borderColor: cores.borda, color: cores.texto, backgroundColor: cores.card }]} placeholder="0000" keyboardType="number-pad" maxLength={4} value={ultimosDigitos} onChangeText={setUltimosDigitos} />
        </View>
      </View>
      <Text style={[styles.label, web && styles.webLabel, web && styles.webLabelEspacado, { color: cores.textoSecundario }]}>Bandeira</Text>
      <View style={styles.opcoes}>{BANDEIRAS.map((item) => <TouchableOpacity key={item} onPress={() => setBandeira(item)} style={[styles.opcao, web && styles.webOpcao, { borderColor: cores.borda }, bandeira === item && { backgroundColor: cores.primario, borderColor: cores.primario }]}><Text style={[styles.opcaoTexto, { color: cores.texto }, bandeira === item && styles.opcaoTextoAtiva]}>{item}</Text></TouchableOpacity>)}</View>
      <View style={web && styles.webCamposColuna}>
        <View>
          <Text style={[styles.label, web && styles.webLabel, web && styles.webLabelEspacado, { color: cores.textoSecundario }]}>Limite do cartão</Text>
          <View style={[styles.valorLinha, web && styles.webInput, { borderColor: cores.borda, backgroundColor: cores.card }]}><Text style={[styles.prefixo, { color: cores.textoSecundario }]}>R$</Text><TextInput style={[styles.valorInput, { color: cores.texto, backgroundColor: cores.card }]} placeholder="0,00" keyboardType="number-pad" value={limite} onChangeText={(texto) => setLimite(formatarValor(texto))} /></View>
        </View>
        <View style={web ? styles.webDatas : styles.datas}>
          <View style={styles.dataColuna}>
            <Text style={[styles.label, web && styles.webLabel, { color: cores.textoSecundario }]}>Vencimento</Text>
            <TextInput style={[styles.input, web && styles.webInput, { borderColor: cores.borda, color: cores.texto, backgroundColor: cores.card }]} placeholder="Dia 10" keyboardType="number-pad" maxLength={2} value={diaVencimento} onChangeText={setDiaVencimento} />
          </View>
          <View style={styles.dataColuna}>
            <Text style={[styles.label, web && styles.webLabel, { color: cores.textoSecundario }]}>Fechamento</Text>
            <TextInput style={[styles.input, web && styles.webInput, { borderColor: cores.borda, color: cores.texto, backgroundColor: cores.card }]} placeholder="Dia 3" keyboardType="number-pad" maxLength={2} value={diaFechamento} onChangeText={setDiaFechamento} />
          </View>
        </View>
      </View>
    </>
  );
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <KeyboardAvoidingView style={[styles.teclado, web && styles.webTeclado]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={web ? styles.webShell : styles.mobileShell}>
          {web ? (
            <>
              <WebPageHeader acaoTexto="Voltar aos cartões" acaoIcone="arrow-back" aoAcionar={() => navigation.goBack()} />
              <PageIntro kicker="LIMITES E FATURAS" titulo="Novo cartão" subtitulo="Adicione os dados e acompanhe limite e fatura em um só lugar." cores={cores} />
            </>
          ) : (
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={24} color={cores.texto} /></TouchableOpacity>
              <Text style={[styles.titulo, { color: cores.texto }]}>Novo cartão</Text>
              <View style={{ width: 24 }} />
            </View>
          )}
          <View style={[styles.formPanel, web && styles.webPanel, web && { backgroundColor: cores.card }]}>
            {web ? (
              <View style={styles.webFormFields}>{camposCartao}</View>
            ) : (
              <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{camposCartao}</ScrollView>
            )}
            {web ? (
              <View style={styles.webAcoes}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.botao, styles.webBotaoSecundario, { borderColor: cores.borda }]}><Text style={[styles.webBotaoSecundarioTexto, { color: cores.texto }]}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity disabled={!podeSalvar} onPress={salvar} style={[styles.botao, styles.webBotao, { backgroundColor: cores.primario }, !podeSalvar && (web ? styles.webDesabilitado : styles.desabilitado)]}><Text style={styles.botaoTexto}>{salvando ? 'Salvando...' : 'Salvar cartão'}</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity disabled={!podeSalvar} onPress={salvar} style={[styles.botao, { backgroundColor: cores.primario }, !podeSalvar && styles.desabilitado]}><Text style={styles.botaoTexto}>{salvando ? 'Salvando...' : 'Salvar cartão'}</Text></TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 }, teclado: { flex: 1, padding: 16 }, webTeclado: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 24 },
  mobileShell: { flex: 1 }, webShell: { flex: 1, width: '100%', maxWidth: 1180, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 14 }, titulo: { fontSize: 16, fontWeight: '600' },
  formPanel: { flex: 1 }, webPanel: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%', height: 452, maxWidth: 960, alignSelf: 'center', borderRadius: 20, padding: 24, marginTop: 2, marginBottom: 20 },
  content: { flexGrow: 1, paddingTop: 2, paddingBottom: 10 }, webFormFields: { paddingTop: 2, paddingBottom: 14 }, webCamposColuna: { gap: 12 }, webDatas: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, marginBottom: 7, marginTop: 16 }, webLabel: { marginTop: 0, marginBottom: 6, fontSize: 12 }, webLabelEspacado: { marginTop: 14 }, opcional: { color: '#8A8A8E' },
  input: { height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 }, webInput: { height: 42, borderRadius: 9, fontSize: 14 },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, opcao: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10 }, webOpcao: { paddingHorizontal: 14, paddingVertical: 8 }, opcaoTexto: { fontSize: 13 }, opcaoTextoAtiva: { color: '#fff' },
  valorLinha: { height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }, prefixo: { fontSize: 16 }, valorInput: { flex: 1, fontSize: 16, padding: 0 }, datas: { flexDirection: 'row', gap: 10 }, dataColuna: { flex: 1 },
  botao: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, webAcoes: { flexDirection: 'row', gap: 8, marginTop: 6 }, webBotao: { flex: 1, height: 42, paddingHorizontal: 20 }, webBotaoSecundario: { flex: 1, height: 42, paddingHorizontal: 20, borderWidth: 1, backgroundColor: 'transparent' }, webBotaoSecundarioTexto: { fontSize: 14, fontWeight: '500' }, desabilitado: { backgroundColor: '#B7D3D0' }, webDesabilitado: { backgroundColor: '#B9A5D8' }, botaoTexto: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
