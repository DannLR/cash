import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMetas, atualizarMeta, atualizarValoresMeta, excluirMeta } from '../database/queries';
import { useTema } from '../context/ThemeContext';

const real = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatarValorInput(texto) {
  const somenteDigitos = texto.replace(/\D/g, '');
  if (!somenteDigitos) return '';
  const numero = parseInt(somenteDigitos, 10) / 100;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function paraNumero(texto) {
  return parseFloat((texto || '0').replace(/\./g, '').replace(',', '.')) || 0;
}

export default function GoalDetailScreen({ route, navigation }) {
  const { cores } = useTema();
  const { metaId } = route.params;
  const [meta, setMeta] = useState(null);
  const [meses, setMeses] = useState(6);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);

  // Editar os valores (guardado e objetivo) direto, tocando no card de
  // progresso — sem precisar de um ícone de edição separado.
  const [modalValores, setModalValores] = useState(false);
  const [campoGuardado, setCampoGuardado] = useState('');
  const [campoObjetivo, setCampoObjetivo] = useState('');

  const carregar = useCallback(async () => {
    const lista = await getMetas();
    const encontrada = lista.find((m) => m.id === metaId);
    setMeta(encontrada || null);
  }, [metaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  if (!meta) {
    return (
      <SafeAreaView style={[styles.centro, { backgroundColor: cores.fundo }]}>
        <ActivityIndicator size="large" color={cores.primario} />
      </SafeAreaView>
    );
  }

  const restante = Math.max(meta.valorObjetivo - meta.valorGuardado, 0);
  const progresso = meta.valorObjetivo > 0 ? Math.min(meta.valorGuardado / meta.valorObjetivo, 1) : 0;
  const mesesRitmoAtual = meta.aporteMensal > 0 && restante > 0 ? Math.ceil(restante / meta.aporteMensal) : null;
  const novoAporte = meses > 0 ? restante / meses : 0;
  const diferenca = novoAporte - meta.aporteMensal;

  function abrirEdicaoValores() {
    setCampoGuardado(meta.valorGuardado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setCampoObjetivo(meta.valorObjetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setModalValores(true);
  }

  async function salvarValores() {
    await atualizarValoresMeta(meta.id, {
      valorGuardado: paraNumero(campoGuardado),
      valorObjetivo: paraNumero(campoObjetivo),
    });
    setModalValores(false);
    carregar();
  }

  async function aplicarNovoAporte() {
    await atualizarMeta(meta.id, { nome: meta.nome, valorObjetivo: meta.valorObjetivo, aporteMensal: Math.round(novoAporte * 100) / 100 });
    carregar();
  }

  async function confirmarExclusao() {
    await excluirMeta(meta.id);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={cores.texto} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: cores.texto }]}>{meta.nome}</Text>
        <TouchableOpacity onPress={() => setConfirmandoExcluir(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {confirmandoExcluir && (
          <View style={[styles.card, { backgroundColor: cores.card }]}>
            <Text style={[styles.confirmTexto, { color: cores.texto }]}>Excluir a meta "{meta.nome}"? Isso não pode ser desfeito.</Text>
            <View style={styles.edicaoBotoes}>
              <TouchableOpacity style={[styles.botaoCancelar, { borderColor: cores.borda }]} onPress={() => setConfirmandoExcluir(false)}>
                <Text style={[styles.botaoCancelarTexto, { color: cores.texto }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoExcluirConfirm} onPress={confirmarExclusao}>
                <Text style={styles.botaoTextoBranco}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={[styles.card, { backgroundColor: cores.card }]} activeOpacity={0.7} onPress={abrirEdicaoValores}>
          <View style={styles.cardValores}>
            <Text style={[styles.cardValorTexto, { color: cores.textoSecundario }]}>{real(meta.valorGuardado)} guardados</Text>
            <Text style={[styles.cardValorTexto, { color: cores.textoSecundario }]}>meta: {real(meta.valorObjetivo)}</Text>
          </View>
          <View style={[styles.trilho, { backgroundColor: cores.fundo }]}>
            <View style={[styles.progresso, { width: `${progresso * 100}%`, backgroundColor: cores.primario }]} />
          </View>
          <Text style={[styles.cardToqueTexto, { color: cores.textoSecundario }]}>Toque para editar os valores</Text>
        </TouchableOpacity>

        <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Ritmo atual</Text>
        <Text style={[styles.ritmoTexto, { color: cores.texto }]}>
          {real(meta.aporteMensal)}/mês
          {mesesRitmoAtual !== null ? ` · atinge em ~${mesesRitmoAtual} ${mesesRitmoAtual === 1 ? 'mês' : 'meses'}` : ''}
        </Text>

        {restante > 0 && (
          <>
            <Text style={[styles.rotulo, { color: cores.textoSecundario, marginTop: 24 }]}>Quero atingir mais rápido</Text>
            <View style={styles.sliderLinha}>
              <TouchableOpacity style={[styles.botaoSlider, { borderColor: cores.borda }]} onPress={() => setMeses((m) => Math.max(1, m - 1))}>
                <Text style={[styles.botaoSliderTexto, { color: cores.texto }]}>–</Text>
              </TouchableOpacity>
              <View style={styles.sliderCentro}>
                <Text style={[styles.sliderNumero, { color: cores.texto }]}>{meses}</Text>
                <Text style={[styles.sliderLabel, { color: cores.textoSecundario }]}>meses</Text>
              </View>
              <TouchableOpacity style={[styles.botaoSlider, { borderColor: cores.borda }]} onPress={() => setMeses((m) => Math.min(60, m + 1))}>
                <Text style={[styles.botaoSliderTexto, { color: cores.texto }]}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardTeal, { backgroundColor: cores.primario }]}>
              <Text style={styles.tealLabel}>Novo aporte necessário</Text>
              <Text style={styles.tealValor}>{real(novoAporte)}/mês</Text>
              <Text style={styles.tealSub}>
                {diferenca > 0
                  ? `${real(diferenca)} a mais por mês do que o ritmo atual`
                  : 'Esse prazo já é mais lento que o seu ritmo atual'}
              </Text>
            </View>

            <TouchableOpacity style={[styles.botaoAplicar, { backgroundColor: cores.primario }]} onPress={aplicarNovoAporte}>
              <Text style={styles.botaoAplicarTexto}>Aplicar novo aporte</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={modalValores} transparent animationType="fade" onRequestClose={() => setModalValores(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalBox, { backgroundColor: cores.card }]}>
            <Text style={[styles.modalTitulo, { color: cores.texto }]}>Editar valores</Text>

            <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario }]}>Valor guardado</Text>
            <View style={[styles.modalValorLinha, { borderColor: cores.borda }]}>
              <Text style={[styles.modalPrefixo, { color: cores.textoSecundario }]}>R$</Text>
              <TextInput
                style={[styles.modalInput, { color: cores.texto }]}
                keyboardType="number-pad"
                value={campoGuardado}
                onChangeText={(t) => setCampoGuardado(formatarValorInput(t))}
                autoFocus
              />
            </View>

            <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario, marginTop: 4 }]}>Valor objetivo</Text>
            <View style={[styles.modalValorLinha, { borderColor: cores.borda }]}>
              <Text style={[styles.modalPrefixo, { color: cores.textoSecundario }]}>R$</Text>
              <TextInput
                style={[styles.modalInput, { color: cores.texto }]}
                keyboardType="number-pad"
                value={campoObjetivo}
                onChangeText={(t) => setCampoObjetivo(formatarValorInput(t))}
              />
            </View>

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={[styles.botaoCancelar, { borderColor: cores.borda }]} onPress={() => setModalValores(false)}>
                <Text style={[styles.botaoCancelarTexto, { color: cores.texto }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botaoSalvar, { backgroundColor: cores.primario }]} onPress={salvarValores}>
                <Text style={styles.botaoTextoBranco}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 16, fontWeight: '600' },
  scroll: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 16, marginBottom: 18 },
  cardValores: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardValorTexto: { fontSize: 13 },
  cardToqueTexto: { fontSize: 11, marginTop: 10, textAlign: 'center' },
  trilho: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progresso: { height: '100%', borderRadius: 4 },
  rotulo: { fontSize: 13, marginBottom: 6 },
  rotuloPequeno: { fontSize: 12, marginBottom: 6 },
  ritmoTexto: { fontSize: 14, marginBottom: 14 },
  confirmTexto: { fontSize: 14, marginBottom: 4, lineHeight: 20 },
  edicaoBotoes: { flexDirection: 'row', gap: 8, marginTop: 14 },
  botaoCancelar: { flex: 1, height: 38, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  botaoCancelarTexto: { fontSize: 13 },
  botaoSalvar: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  botaoExcluirConfirm: { flex: 1, height: 38, borderRadius: 8, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  botaoTextoBranco: { fontSize: 14, color: '#fff', fontWeight: '600' },
  sliderLinha: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, justifyContent: 'center' },
  botaoSlider: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  botaoSliderTexto: { fontSize: 18 },
  sliderCentro: { alignItems: 'center', minWidth: 70 },
  sliderNumero: { fontSize: 28, fontWeight: '600' },
  sliderLabel: { fontSize: 12 },
  cardTeal: { borderRadius: 12, padding: 16, marginBottom: 14 },
  tealLabel: { fontSize: 12, color: '#CCFBF1', marginBottom: 4 },
  tealValor: { fontSize: 22, fontWeight: '600', color: '#fff' },
  tealSub: { fontSize: 12, color: '#CCFBF1', marginTop: 6 },
  botaoAplicar: { height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  botaoAplicarTexto: { fontSize: 14, fontWeight: '600', color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { borderRadius: 14, padding: 20, width: '100%' },
  modalTitulo: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  modalValorLinha: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 50, marginBottom: 14 },
  modalPrefixo: { fontSize: 18 },
  modalInput: { flex: 1, fontSize: 20, fontWeight: '600', padding: 0 },
  modalBotoes: { flexDirection: 'row', gap: 10, marginTop: 6 },
});