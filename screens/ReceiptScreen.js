import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { recognizeText } from 'expo-ocr-kit';
import CampoData from '../components/CampoData';
import PageIntro from '../components/PageIntro';
import WebPageHeader from '../components/WebPageHeader';
import { useTema } from '../context/ThemeContext';
import { parseValorMoeda } from '../utils/moeda';

const CATEGORIAS = ['Mercado', 'Restaurantes', 'Combustível', 'Lazer', 'Compras', 'Outros'];

function formatarValorInput(texto) {
  const digitos = String(texto || '').replace(/\D/g, '');
  if (!digitos) return '';
  return (parseInt(digitos, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataHoje() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

function formatarData(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function parsearData(texto) {
  const match = String(texto || '').match(/\b([0-3]?\d)[/.-]([01]?\d)[/.-](\d{2,4})\b/);
  if (!match) return null;
  const dia = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  let ano = parseInt(match[3], 10);
  if (ano < 100) ano += ano >= 70 ? 1900 : 2000;
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia ? data : null;
}

function extrairValor(texto) {
  const linhas = String(texto || '').split(/\r?\n/);
  const padrao = /(?:R\$\s*)?((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})/gi;
  const candidatos = [];

  linhas.forEach((linha, indice) => {
    const termos = linha.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    let match;
    while ((match = padrao.exec(linha)) !== null) {
      const valor = parseValorMoeda(match[1]);
      if (valor <= 0) continue;
      let prioridade = 0;
      if (/total a pagar|valor pago|total pago|valor total|total geral|total da compra/.test(termos)) prioridade += 10;
      else if (/\btotal\b/.test(termos)) prioridade += 8;
      else if (/subtotal/.test(termos)) prioridade += 4;
      if (/troco|desconto|economia/.test(termos)) prioridade -= 8;
      candidatos.push({ valor, prioridade, indice });
    }
    padrao.lastIndex = 0;
  });

  candidatos.sort((a, b) => b.prioridade - a.prioridade || b.indice - a.indice);
  return candidatos[0]?.valor || 0;
}

function extrairEstabelecimento(texto) {
  const ignorar = /\b(cnpj|cpf|danfe|cupom|fiscal|consumidor|protocolo|chave|documento|comprovante|pagamento|valor|total|subtotal|troco|cartao|cartão|pix|dinheiro)\b/i;
  const linhas = String(texto || '').split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean);
  return linhas.find((linha) => (
    linha.length >= 3 && linha.length <= 48 &&
    !ignorar.test(linha) &&
    !/\d{2,}/.test(linha) &&
    !/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/.test(linha)
  )) || '';
}

function sugerirCategoria(texto) {
  const normalizado = String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/mercado|supermerc|atacadao|assai|carrefour|horti|mercearia/.test(normalizado)) return 'Mercado';
  if (/restaurante|lanchonete|pizzaria|ifood|burger|cafeteria|padaria/.test(normalizado)) return 'Restaurantes';
  if (/posto|combustivel|gasolina|etanol|diesel|shell|ipiranga/.test(normalizado)) return 'Combustível';
  if (/cinema|parque|show|teatro|ingresso/.test(normalizado)) return 'Lazer';
  return 'Compras';
}

export default function ReceiptScreen({ navigation }) {
  const { cores } = useTema();
  const [imagem, setImagem] = useState(null);
  const [textoLido, setTextoLido] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(dataHoje());
  const [estabelecimento, setEstabelecimento] = useState('');
  const [categoria, setCategoria] = useState('Compras');
  const [categoriaCustom, setCategoriaCustom] = useState('');
  const [lendo, setLendo] = useState(false);

  async function processarImagem(asset) {
    if (!asset?.uri) return;
    setImagem(asset.uri);
    setLendo(true);
    setTextoLido('');
    try {
      const resultado = await recognizeText(asset.uri);
      const texto = resultado?.text?.trim() || '';
      if (!texto) {
        Alert.alert('Não encontrei texto', 'Tente novamente com o comprovante bem iluminado e enquadrado.');
        return;
      }
      setTextoLido(texto);
      const total = extrairValor(texto);
      setValor(total ? formatarValorInput(String(Math.round(total * 100))) : '');
      setData(parsearData(texto) || dataHoje());
      setEstabelecimento(extrairEstabelecimento(texto));
      setCategoria(sugerirCategoria(texto));
    } catch (erro) {
      console.error('Falha ao ler comprovante:', erro);
      Alert.alert('Não foi possível ler', 'Confira se a imagem está nítida e tente novamente.');
    } finally {
      setLendo(false);
    }
  }

  async function tirarFoto() {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Acesso à câmera', 'Permita o acesso à câmera para fotografar o comprovante.');
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 });
    if (!resultado.canceled) await processarImagem(resultado.assets?.[0]);
  }

  async function escolherImagem() {
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
    if (!resultado.canceled) await processarImagem(resultado.assets?.[0]);
  }

  function continuar() {
    if (!parseValorMoeda(valor)) {
      Alert.alert('Confira o valor', 'Não consegui reconhecer o total. Digite o valor do comprovante para continuar.');
      return;
    }
    if (categoria === 'Outros' && !categoriaCustom.trim()) {
      Alert.alert('Informe a categoria', 'Digite o nome da categoria para continuar.');
      return;
    }
    navigation.replace('AdicionarMovimentacao', {
      tipo: 'saida',
      valorInicial: valor,
      categoriaInicial: categoria,
      categoriaCustomInicial: categoriaCustom.trim(),
      dataInicial: formatarData(data),
      descricaoInicial: estabelecimento.trim(),
      comprovante: true,
    });
  }

  const web = Platform.OS === 'web';
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, web && styles.webContent]} keyboardShouldPersistTaps="handled">
          {web ? (
            <WebPageHeader acaoTexto="Voltar" acaoIcone="arrow-back" aoAcionar={() => navigation.goBack()} />
          ) : (
            <View style={styles.mobileHeader}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton} accessibilityLabel="Fechar">
                <Ionicons name="close" size={23} color={cores.texto} />
              </TouchableOpacity>
              <Text style={[styles.mobileTitle, { color: cores.texto }]}>Ler comprovante</Text>
              <View style={styles.closeButton} />
            </View>
          )}

          {web && <PageIntro kicker="NOVO GASTO" titulo="Ler comprovante" subtitulo="Fotografe ou escolha uma imagem para preencher os dados do lançamento." cores={cores} />}

          <View style={[styles.panel, { backgroundColor: cores.card, borderColor: cores.borda }]}>
            {!imagem ? (
              <View style={styles.emptyState}>
                <View style={[styles.receiptIcon, { backgroundColor: cores.fundoIcone }]}>
                  <Ionicons name="receipt-outline" size={25} color={cores.primario} />
                </View>
                <Text style={[styles.emptyTitle, { color: cores.texto }]}>Adicione o comprovante</Text>
                <Text style={[styles.helper, { color: cores.textoSecundario }]}>O texto será reconhecido no aparelho. A imagem não é enviada para a nuvem.</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={[styles.secondaryButton, { borderColor: cores.borda }]} onPress={escolherImagem}>
                    <Ionicons name="image-outline" size={17} color={cores.primario} />
                    <Text style={[styles.secondaryText, { color: cores.texto }]}>Escolher imagem</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryButton, { backgroundColor: cores.primario }]} onPress={tirarFoto}>
                    <Ionicons name="camera-outline" size={17} color="#fff" />
                    <Text style={styles.primaryText}>Tirar foto</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.previewHeader}>
                  <Text style={[styles.sectionTitle, { color: cores.texto }]}>Confira os dados encontrados</Text>
                  <TouchableOpacity onPress={escolherImagem} accessibilityLabel="Trocar comprovante">
                    <Text style={[styles.changeText, { color: cores.primario }]}>Trocar imagem</Text>
                  </TouchableOpacity>
                </View>
                <Image source={{ uri: imagem }} style={styles.preview} resizeMode="contain" />
                {lendo ? (
                  <View style={styles.loading}><ActivityIndicator color={cores.primario} /><Text style={[styles.helper, { color: cores.textoSecundario }]}>Lendo o comprovante…</Text></View>
                ) : textoLido ? (
                  <View style={styles.fields}>
                    <Text style={[styles.label, { color: cores.textoSecundario }]}>Valor total</Text>
                    <View style={[styles.valueField, { borderColor: cores.borda }]}>
                      <Text style={[styles.currency, { color: cores.textoSecundario }]}>R$</Text>
                      <TextInput value={valor} onChangeText={(texto) => setValor(formatarValorInput(texto))} placeholder="0,00" keyboardType="number-pad" style={[styles.valueInput, { color: cores.texto }]} />
                    </View>

                    <Text style={[styles.label, { color: cores.textoSecundario }]}>Estabelecimento</Text>
                    <TextInput value={estabelecimento} onChangeText={setEstabelecimento} placeholder="Nome do estabelecimento" style={[styles.input, { color: cores.texto, borderColor: cores.borda }]} />

                    <Text style={[styles.label, { color: cores.textoSecundario }]}>Data da compra</Text>
                    <CampoData valor={data} aoAlterar={setData} cores={cores} estilo={styles.input} />

                    <Text style={[styles.label, { color: cores.textoSecundario }]}>Categoria sugerida</Text>
                    <View style={styles.categories}>
                      {CATEGORIAS.map((item) => (
                        <TouchableOpacity key={item} onPress={() => setCategoria(item)} style={[styles.category, { borderColor: categoria === item ? cores.primario : cores.borda, backgroundColor: categoria === item ? cores.fundoIcone : 'transparent' }]}>
                          <Text style={[styles.categoryText, { color: categoria === item ? cores.primario : cores.texto }]}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {categoria === 'Outros' && (
                      <TextInput value={categoriaCustom} onChangeText={setCategoriaCustom} placeholder="Nome da categoria" style={[styles.input, { color: cores.texto, borderColor: cores.borda, marginTop: 6 }]} />
                    )}

                    <Text style={[styles.ocrLabel, { color: cores.textoSecundario }]}>Texto reconhecido</Text>
                    <Text numberOfLines={5} style={[styles.ocrText, { color: cores.textoSecundario, backgroundColor: cores.fundo }]}>{textoLido}</Text>
                    <TouchableOpacity style={[styles.primaryButton, styles.continueButton, { backgroundColor: cores.primario }]} onPress={continuar}>
                      <Text style={styles.primaryText}>Continuar lançamento</Text>
                      <Ionicons name="arrow-forward" size={17} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 36, flexGrow: 1 },
  webContent: { width: '100%', maxWidth: 1000, alignSelf: 'center', padding: 24 },
  mobileHeader: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  mobileTitle: { fontSize: 16, fontWeight: '600' },
  panel: { borderRadius: 18, borderWidth: 1, padding: 18, maxWidth: 720, width: '100%', alignSelf: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 12 },
  receiptIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  helper: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 420 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 22, width: '100%', justifyContent: 'center', flexWrap: 'wrap' },
  primaryButton: { minHeight: 46, borderRadius: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  secondaryButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryText: { fontSize: 13, fontWeight: '600' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  changeText: { fontSize: 12, fontWeight: '600' },
  preview: { width: '100%', height: 220, borderRadius: 12, backgroundColor: '#F4F1F6', marginBottom: 16 },
  loading: { minHeight: 88, alignItems: 'center', justifyContent: 'center', gap: 10 },
  fields: { gap: 8 },
  label: { fontSize: 12, marginTop: 6 },
  valueField: { height: 46, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  currency: { fontSize: 15, marginRight: 8 },
  valueInput: { flex: 1, fontSize: 17, paddingVertical: 8 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 2 },
  category: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  categoryText: { fontSize: 12 },
  ocrLabel: { fontSize: 11, marginTop: 8 },
  ocrText: { borderRadius: 10, padding: 11, fontSize: 11, lineHeight: 16 },
  continueButton: { marginTop: 10, alignSelf: 'stretch' },
});
