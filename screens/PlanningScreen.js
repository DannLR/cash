import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getProximosLancamentos, calcularResumoMensal } from '../database/queries';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';
import WebPageHeader from '../components/WebPageHeader';
import PageIntro from '../components/PageIntro';
import { navigationRef } from '../App';

function formatarReal(valor) {
  const abs = Math.abs(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return valor < 0 ? `-${abs}` : `+${abs}`;
}

export default function PlanningScreen() {
  const { ano, mes, referencia } = useMes();
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web' && width >= 768;
  const [lancamentos, setLancamentos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      async function carregar() {
        setCarregando(true);
        const [listaLancamentos, resumoMensal] = await Promise.all([
          getProximosLancamentos(referencia),
          calcularResumoMensal(ano, mes),
        ]);
        if (ativo) {
          setLancamentos(listaLancamentos);
          setResumo(resumoMensal);
          setCarregando(false);
        }
      }
      carregar();
      return () => { ativo = false; };
    }, [ano, mes])
  );

  if (carregando || !resumo) {
    return (
      <SafeAreaView style={[styles.container, styles.centro, { backgroundColor: cores.fundo }]}>
        <ActivityIndicator size="large" color={cores.primario} />
      </SafeAreaView>
    );
  }

  const totalLancamentos = lancamentos.reduce((soma, item) => soma + Math.abs(item.valor), 0);

  if (web) {
    return (
      <PlanningWeb
        cores={cores}
        lancamentos={lancamentos}
        resumo={resumo}
        totalLancamentos={totalLancamentos}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.cardTotal, { backgroundColor: cores.card }]}>
          <Text style={[styles.cardLabel, { color: cores.textoSecundario }]}>Total dos próximos lançamentos</Text>
          <Text style={[styles.totalValor, { color: cores.texto }]}>{formatarReal(totalLancamentos).replace('+', '')}</Text>
        </View>

        <View style={styles.alerta}>
          <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
          <Text style={styles.alertaTexto}>
            Considerando o que ainda falta pagar este mês, seu saldo mínimo
            previsto fica em torno de {formatarReal(resumo.saldoLivreReal).replace('+', '')}.
          </Text>
        </View>

        <Text style={[styles.secaoTitulo, { color: cores.textoSecundario }]}>Próximos lançamentos</Text>
        {lancamentos.length === 0 && (
          <Text style={[styles.vazio, { color: cores.textoSecundario }]}>Nenhuma conta recorrente cadastrada ainda.</Text>
        )}
        {lancamentos.map((item, i) => (
          <View key={i} style={[styles.item, { borderBottomColor: cores.borda }]}>
            <View style={styles.itemEsquerda}>
              <View style={[styles.itemDia, { backgroundColor: cores.card }]}>
                <Text style={[styles.itemDiaTexto, { color: cores.texto }]}>{item.dia}</Text>
              </View>
              <View>
                <Text style={[styles.itemNome, { color: cores.texto }]}>{item.nome}</Text>
                <Text style={[styles.itemTipo, { color: cores.textoSecundario }]}>{item.tipo}</Text>
              </View>
            </View>
            <Text
              style={[styles.itemValor, { color: item.valor < 0 ? cores.texto : '#34C759' }]}
            >
              {formatarReal(item.valor)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanningWeb({ cores, lancamentos, resumo, totalLancamentos }) {
  return (
    <SafeAreaView style={[webStyles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={webStyles.scrollContent}>
        <WebPageHeader acaoTexto="Novo lançamento" aoAcionar={() => navigationRef.navigate('AdicionarMovimentacao')} />
        <PageIntro
          kicker="O QUE VEM PELA FRENTE"
          titulo="Planejamento"
          subtitulo="Antecipe os compromissos que já têm lugar no seu mês."
          cores={cores}
        />

        <View style={webStyles.linha}>
          <View style={[webStyles.cardTotal, { backgroundColor: cores.card }]}>
            <View style={[webStyles.iconeTotal, { backgroundColor: cores.fundo }]}>
              <Ionicons name="hourglass-outline" size={17} color={cores.primario} />
            </View>
            <Text style={[webStyles.cardLabel, { color: cores.textoSecundario }]}>Total dos próximos lançamentos</Text>
            <Text style={[webStyles.totalValor, { color: cores.texto }]}>{formatarReal(totalLancamentos).replace('+', '')}</Text>
            <View style={webStyles.alerta}>
              <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
              <Text style={webStyles.alertaTexto}>
                Considerando o que ainda falta pagar, seu saldo mínimo previsto fica em torno de{' '}
                {formatarReal(resumo.saldoLivreReal).replace('+', '')}.
              </Text>
            </View>
          </View>

          <View style={[webStyles.cardLista, { backgroundColor: cores.card }]}>
            <View style={webStyles.listaTopo}>
              <Text style={[webStyles.listaTitulo, { color: cores.texto }]}>Próximos lançamentos</Text>
              <Text style={[webStyles.listaContagem, { color: cores.textoSecundario }]}>{lancamentos.length} itens</Text>
            </View>
            {lancamentos.length === 0 && (
              <Text style={[webStyles.vazio, { color: cores.textoSecundario }]}>Nenhuma conta recorrente cadastrada ainda.</Text>
            )}
            {lancamentos.map((item, i) => (
              <View key={i} style={[webStyles.item, { borderBottomColor: cores.borda }]}>
                <View style={webStyles.itemEsquerda}>
                  <View style={[webStyles.itemDia, { backgroundColor: cores.fundo }]}>
                    <Text style={[webStyles.itemDiaTexto, { color: cores.texto }]}>{item.dia}</Text>
                  </View>
                  <View>
                    <Text style={[webStyles.itemNome, { color: cores.texto }]}>{item.nome}</Text>
                    <Text style={[webStyles.itemTipo, { color: cores.textoSecundario }]}>{item.tipo}</Text>
                  </View>
                </View>
                <View style={webStyles.itemDireita}>
                  <Ionicons name="arrow-down" size={13} color={item.valor < 0 ? cores.textoSecundario : '#34C759'} />
                  <Text style={[webStyles.itemValor, { color: item.valor < 0 ? cores.texto : '#34C759' }]}>
                    {Math.abs(item.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 60, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  linha: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  cardTotal: { flex: 1, borderRadius: 20, padding: 24 },
  iconeTotal: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  cardLabel: { fontSize: 13, marginBottom: 6 },
  totalValor: { fontSize: 28, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 20 },
  alerta: { flexDirection: 'row', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  alertaTexto: { flex: 1, fontSize: 12, color: '#B91C1C', lineHeight: 17 },
  cardLista: { flex: 1.5, borderRadius: 20, padding: 24 },
  listaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listaTitulo: { fontSize: 16, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' },
  listaContagem: { fontSize: 11 },
  vazio: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  itemEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemDia: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemDiaTexto: { fontSize: 13, fontWeight: '600' },
  itemNome: { fontSize: 14, fontWeight: '600' },
  itemTipo: { fontSize: 12, marginTop: 1 },
  itemDireita: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  itemValor: { fontSize: 14, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  cardTotal: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 13, marginBottom: 4 },
  totalValor: { fontSize: 24, fontWeight: '600' },
  alerta: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  alertaTexto: { flex: 1, fontSize: 13, color: '#B91C1C', lineHeight: 19 },
  secaoTitulo: { fontSize: 13, marginBottom: 10 },
  vazio: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
  },
  itemEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemDia: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDiaTexto: { fontSize: 13, fontWeight: '500' },
  itemNome: { fontSize: 14, fontWeight: '500' },
  itemTipo: { fontSize: 12 },
  itemValor: { fontSize: 14, fontWeight: '500' },
});