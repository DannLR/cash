import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';
import WebPageHeader from '../components/WebPageHeader';
import PageIntro from '../components/PageIntro';

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function MonthPickerScreen({ navigation }) {
  const { ano, mes, irPara } = useMes();
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web' && width >= 768;
  const [anoVisualizado, setAnoVisualizado] = useState(ano);

  function selecionar(mesIndex) {
    irPara(anoVisualizado, mesIndex);
    navigation.goBack();
  }

  const seletorAno = (
    <View style={[styles.seletorAno, web && styles.webSeletorAno]}>
      <TouchableOpacity onPress={() => setAnoVisualizado((a) => a - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Ano anterior">
        <Ionicons name="chevron-back" size={20} color={cores.textoSecundario} />
      </TouchableOpacity>
      <Text style={[styles.anoTexto, { color: cores.texto }]}>{anoVisualizado}</Text>
      <TouchableOpacity onPress={() => setAnoVisualizado((a) => a + 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Próximo ano">
        <Ionicons name="chevron-forward" size={20} color={cores.textoSecundario} />
      </TouchableOpacity>
    </View>
  );

  const gradeMeses = (
    <View style={[styles.grid, web && styles.webGrid]}>
      {NOMES_MESES.map((nomeMes, index) => {
        const selecionado = anoVisualizado === ano && index === mes;
        return (
          <TouchableOpacity
            key={nomeMes}
            style={[styles.mesBotao, web && styles.webMesBotao, { borderColor: cores.borda }, selecionado && { backgroundColor: cores.primario, borderColor: cores.primario }]}
            onPress={() => selecionar(index)}
            activeOpacity={0.8}
          >
            <Text style={[styles.mesTexto, { color: cores.texto }, selecionado && styles.mesTextoSelecionado]}>{nomeMes}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      {web ? (
        <ScrollView contentContainerStyle={styles.webPage}>
          <WebPageHeader acaoTexto="Fechar" acaoIcone="close" aoAcionar={() => navigation.goBack()} />
          <PageIntro kicker="VISÃO FINANCEIRA MENSAL" titulo="Escolha um mês" subtitulo="Consulte suas contas e movimentações em outro período." cores={cores} />
          <View style={[styles.webPanel, { backgroundColor: cores.card }]}>
            {seletorAno}
            {gradeMeses}
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={cores.texto} />
            </TouchableOpacity>
            <Text style={[styles.headerTitulo, { color: cores.texto }]}>Selecionar mês</Text>
            <View style={{ width: 24 }} />
          </View>
          {seletorAno}
          {gradeMeses}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webPage: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32, width: '100%', maxWidth: 1180, alignSelf: 'center' },
  webPanel: { width: '100%', maxWidth: 760, alignSelf: 'center', borderRadius: 20, padding: 22 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  headerTitulo: { fontSize: 15, fontWeight: '500' },
  seletorAno: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
  },
  webSeletorAno: { paddingVertical: 4, marginBottom: 12 },
  anoTexto: { fontSize: 18, fontWeight: '600', minWidth: 70, textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    justifyContent: 'center',
  },
  webGrid: { paddingHorizontal: 0, gap: 10, justifyContent: 'space-between' },
  mesBotao: {
    width: '30%',
    height: 56,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMesBotao: { width: '22%', height: 46, borderRadius: 12 },
  mesTexto: { fontSize: 13, fontWeight: '500' },
  mesTextoSelecionado: { color: '#fff' },
});
