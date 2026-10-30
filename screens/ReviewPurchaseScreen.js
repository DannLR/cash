import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CampoData from '../components/CampoData';
import { useTema } from '../context/ThemeContext';
import { confirmarNotificacoesRevisadas, obterComprasPendentes } from '../services/androidPurchaseCapture';
import { getCartoes, importarCompraNotificada } from '../database/queries';

const CATEGORIAS = ['Compras', 'Mercado', 'Restaurantes', 'Combustível', 'Lazer', 'Outros'];

function formatarValorInput(texto) {
  const digitos = texto.replace(/\D/g, '');
  if (!digitos) return '';
  return (parseInt(digitos, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReviewPurchaseScreen({ navigation, route }) {
  const { cores } = useTema();
  const [compra, setCompra] = useState(null);
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('Compras');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(new Date());
  const [formaPagamento, setFormaPagamento] = useState('notificacao');
  const [cartoes, setCartoes] = useState([]);
  const [cartaoId, setCartaoId] = useState(null);
  const [parcelas, setParcelas] = useState('1');
  const [salvando, setSalvando] = useState(false);
  const [carregandoCompra, setCarregandoCompra] = useState(true);

  useEffect(() => {
    const encontrada = obterComprasPendentes().find((item) => item.id === route.params?.purchaseId);
    getCartoes().then(setCartoes);
    setCarregandoCompra(false);
    if (!encontrada) return;
    setCompra(encontrada);
    setValor(formatarValorInput(String(Math.round(Number(encontrada.valor) * 100))));
    setDescricao('');
    setData(new Date(Number(encontrada.data)));
    setCartaoId(null);
    const texto = String(encontrada.texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    setFormaPagamento(texto.includes('credito') || texto.includes('credit') ? 'credito' : texto.includes('debito') || texto.includes('debit') ? 'debito' : 'notificacao');
    const parcelasTexto = texto.match(/(\d{1,2})\s*x\b/) || texto.match(/(\d{1,2})\s+parcelas?/);
    setParcelas(parcelasTexto?.[1] || '1');
  }, [route.params?.purchaseId]);

  async function incluirCompra() {
    const valorNumero = Number(valor.replace(/\./g, '').replace(',', '.'));
    if (!compra || !Number.isFinite(valorNumero) || valorNumero <= 0) {
      Alert.alert('Confira o valor', 'Digite um valor válido para a compra.');
      return;
    }
    if (['credito', 'debito'].includes(formaPagamento) && !cartaoId) {
      Alert.alert('Selecione um cartão', 'Escolha o cartão usado na compra para que ela apareça na aba Cartões.');
      return;
    }
    setSalvando(true);
    try {
      await importarCompraNotificada(compra, {
        valor: valorNumero,
        categoriaNome: categoria,
        descricao: descricao.trim() || `Compra via ${compra.origem || 'notificação'}`,
        data: data.toISOString(),
        formaPagamento,
        cartaoId,
        quantidadeParcelas: parcelas,
      });
      confirmarNotificacoesRevisadas([compra.id]);
      navigation.goBack();
    } catch (erro) {
      console.error('Não foi possível incluir a compra detectada:', erro);
      Alert.alert('Não foi possível incluir', 'Confira os dados e tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  function descartarCompra() {
    if (!compra) return;
    Alert.alert('Descartar compra?', 'Esta notificação não será incluída nos seus gastos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => { confirmarNotificacoesRevisadas([compra.id]); navigation.goBack(); } },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Voltar">
          <Ionicons name="close" size={23} color={cores.texto} />
        </TouchableOpacity>
        <Text style={[styles.headerTitulo, { color: cores.texto }]}>Revisar compra</Text>
        <View style={{ width: 23 }} />
      </View>

      {carregandoCompra ? (
        <View style={styles.carregando}><ActivityIndicator color={cores.primario} /></View>
      ) : !compra ? (
        <View style={styles.carregando}>
          <Text style={{ color: cores.textoSecundario, textAlign: 'center', marginBottom: 14 }}>Esta notificação não está mais pendente.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: cores.primario, fontWeight: '700' }}>Voltar</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <View style={[styles.cardOrigem, { backgroundColor: cores.card, borderColor: cores.borda }]}>
            <View style={styles.linhaOrigem}>
              <Ionicons name="notifications-outline" size={18} color={cores.primario} />
              <Text style={[styles.origem, { color: cores.texto }]}>Detectada em {compra.origem || 'notificação'}</Text>
            </View>
            {!!compra.texto && <Text style={[styles.textoNotificacao, { color: cores.textoSecundario }]} numberOfLines={3}>{compra.texto}</Text>}
          </View>

          <View style={[styles.formulario, { backgroundColor: cores.card, borderColor: cores.borda }]}>
            <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Valor</Text>
            <View style={[styles.campoValor, { borderColor: cores.borda }]}>
              <Text style={[styles.prefixo, { color: cores.textoSecundario }]}>R$</Text>
              <TextInput
                style={[styles.inputValor, { color: cores.texto }]}
                value={valor}
                onChangeText={(texto) => setValor(formatarValorInput(texto))}
                keyboardType="number-pad"
                placeholder="0,00"
                placeholderTextColor={cores.textoSecundario}
              />
            </View>

            <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Categoria</Text>
            <View style={styles.categorias}>
              {CATEGORIAS.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setCategoria(item)}
                  style={[styles.chip, { borderColor: categoria === item ? cores.primario : cores.borda, backgroundColor: categoria === item ? cores.primario : 'transparent' }]}
                >
                  <Text style={{ color: categoria === item ? '#fff' : cores.texto, fontSize: 12 }}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Como foi paga?</Text>
            <View style={styles.categorias}>
              {[
                { id: 'notificacao', label: 'Outro gasto' },
                { id: 'debito', label: 'Débito' },
                { id: 'credito', label: 'Crédito' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setFormaPagamento(item.id)}
                  style={[styles.chip, { borderColor: formaPagamento === item.id ? cores.primario : cores.borda, backgroundColor: formaPagamento === item.id ? cores.primario : 'transparent' }]}
                >
                  <Text style={{ color: formaPagamento === item.id ? '#fff' : cores.texto, fontSize: 12 }}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {['debito', 'credito'].includes(formaPagamento) && (
              <>
                <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Cartão</Text>
                {cartoes.length ? (
                  <View style={styles.categorias}>
                    {cartoes.map((cartao) => (
                      <TouchableOpacity
                        key={cartao.id}
                        onPress={() => setCartaoId(cartao.id)}
                        style={[styles.chip, { borderColor: cartaoId === cartao.id ? cores.primario : cores.borda, backgroundColor: cartaoId === cartao.id ? cores.primario : 'transparent' }]}
                      >
                        <Text style={{ color: cartaoId === cartao.id ? '#fff' : cores.texto, fontSize: 12 }}>{cartao.apelido}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: cores.textoSecundario, fontSize: 12 }}>Cadastre um cartão antes de vincular esta compra.</Text>
                )}
              </>
            )}

            {formaPagamento === 'credito' && (
              <>
                <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Parcelas</Text>
                <TextInput
                  style={[styles.input, { borderColor: cores.borda, color: cores.texto }]}
                  value={parcelas}
                  onChangeText={(texto) => setParcelas(texto.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={cores.textoSecundario}
                />
              </>
            )}

            <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Estabelecimento (opcional)</Text>
            <TextInput
              style={[styles.input, { borderColor: cores.borda, color: cores.texto }]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex.: mercado, loja, restaurante"
              placeholderTextColor={cores.textoSecundario}
            />

            <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Data da compra</Text>
            <CampoData valor={data} aoAlterar={setData} cores={cores} />

            <TouchableOpacity onPress={incluirCompra} disabled={salvando} style={[styles.botaoIncluir, { backgroundColor: cores.primario, opacity: salvando ? 0.7 : 1 }]}>
              {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoIncluirTexto}>Incluir gasto</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={descartarCompra} style={styles.botaoDescartar}>
              <Text style={{ color: '#C62828', fontSize: 13, fontWeight: '600' }}>Descartar notificação</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitulo: { fontSize: 16, fontWeight: '700' },
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  conteudo: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 16, gap: 12, paddingBottom: 32 },
  cardOrigem: { borderWidth: 1, borderRadius: 16, padding: 14 },
  linhaOrigem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  origem: { fontSize: 13, fontWeight: '600' },
  textoNotificacao: { fontSize: 12, lineHeight: 17, marginTop: 9 },
  formulario: { borderWidth: 1, borderRadius: 18, padding: 16 },
  rotulo: { fontSize: 12, marginTop: 15, marginBottom: 7 },
  campoValor: { minHeight: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  prefixo: { fontSize: 17, marginRight: 7 },
  inputValor: { flex: 1, fontSize: 20, fontWeight: '700', paddingVertical: 8 },
  categorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 8 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, fontSize: 14 },
  botaoIncluir: { minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  botaoIncluirTexto: { color: '#fff', fontSize: 14, fontWeight: '700' },
  botaoDescartar: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
});
