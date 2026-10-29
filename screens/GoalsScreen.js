import React, { useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMetas } from '../database/queries';
import { useTema } from '../context/ThemeContext';
import WebPageHeader from '../components/WebPageHeader';
import PageIntro from '../components/PageIntro';

const real = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function GoalsScreen({ navigation }) {
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web' && width >= 768;
  const [metas, setMetas] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      getMetas().then((r) => ativo && setMetas(r));
      return () => { ativo = false; };
    }, [])
  );

  if (!metas) {
    return (
      <SafeAreaView style={[styles.centro, { backgroundColor: cores.fundo }]}>
        <ActivityIndicator size="large" color={cores.primario} />
      </SafeAreaView>
    );
  }

  if (web) return <GoalsWeb metas={metas} cores={cores} navigation={navigation} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={cores.texto} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: cores.texto }]}>Metas</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {metas.length === 0 ? (
          <View style={styles.vazio}>
            <Ionicons name="flag-outline" size={36} color={cores.textoSecundario} />
            <Text style={[styles.vazioTitulo, { color: cores.texto }]}>Crie sua primeira meta</Text>
            <Text style={[styles.vazioTexto, { color: cores.textoSecundario }]}>
              Entrada de apartamento, viagem, reserva de emergência — o que
              quiser guardar dinheiro para conquistar.
            </Text>
          </View>
        ) : (
          metas.map((meta) => {
            const progresso = meta.valorObjetivo > 0 ? Math.min(meta.valorGuardado / meta.valorObjetivo, 1) : 0;
            const restante = meta.valorObjetivo - meta.valorGuardado;
            const meses = meta.aporteMensal > 0 && restante > 0 ? Math.ceil(restante / meta.aporteMensal) : null;
            return (
              <TouchableOpacity
                key={meta.id}
                style={[styles.card, { backgroundColor: cores.card }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DetalhesMeta', { metaId: meta.id })}
              >
                <View style={styles.cardTopo}>
                  <View style={styles.cardTopoEsquerda}>
                    <Ionicons name={meta.icone} size={18} color={cores.primario} />
                    <Text style={[styles.cardNome, { color: cores.texto }]}>{meta.nome}</Text>
                  </View>
                  <Text style={[styles.cardPorcentagem, { color: cores.textoSecundario }]}>{Math.round(progresso * 100)}%</Text>
                </View>
                <View style={[styles.trilho, { backgroundColor: cores.fundo }]}>
                  <View style={[styles.progresso, { width: `${progresso * 100}%`, backgroundColor: cores.primario }]} />
                </View>
                <View style={styles.cardValores}>
                  <Text style={[styles.cardValorTexto, { color: cores.textoSecundario }]}>{real(meta.valorGuardado)} guardados</Text>
                  <Text style={[styles.cardValorTexto, { color: cores.textoSecundario }]}>meta: {real(meta.valorObjetivo)}</Text>
                </View>
                {meta.aporteMensal > 0 && (
                  <Text style={[styles.cardAporte, { color: cores.texto }]}>
                    Aporte de {real(meta.aporteMensal)}/mês
                    {meses !== null ? ` · atinge em ~${meses} ${meses === 1 ? 'mês' : 'meses'}` : ''}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: cores.primario }]} onPress={() => navigation.navigate('AdicionarMeta')}>
        <Ionicons name="add" size={19} color="#fff" />
        <Text style={styles.fabTexto}>Nova meta</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function GoalsWeb({ metas, cores, navigation }) {
  const totalGuardado = metas.reduce((soma, meta) => soma + meta.valorGuardado, 0);

  return (
    <SafeAreaView style={[webStyles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={webStyles.scrollContent}>
        <WebPageHeader acaoTexto="Nova meta" aoAcionar={() => navigation.navigate('AdicionarMeta')} />
        <PageIntro kicker="OBJETIVOS FINANCEIROS" titulo="Metas" subtitulo="Acompanhe o progresso do que você está construindo." cores={cores} />

        <View style={[webStyles.summary, { backgroundColor: cores.card }]}>
          <View style={webStyles.summaryIcon}><Ionicons name="flag-outline" size={17} color="#8665B5" /></View>
          <View>
            <Text style={[webStyles.summaryLabel, { color: cores.textoSecundario }]}>Total guardado</Text>
            <Text style={[webStyles.summaryValue, { color: cores.texto }]}>{real(totalGuardado)}</Text>
          </View>
          <Text style={[webStyles.summaryCount, { color: cores.textoSecundario }]}>{metas.length} {metas.length === 1 ? 'meta ativa' : 'metas ativas'}</Text>
        </View>

        {metas.length === 0 ? (
          <View style={[webStyles.empty, { backgroundColor: cores.card }]}>
            <View style={webStyles.emptyIcon}><Ionicons name="flag-outline" size={20} color="#8665B5" /></View>
            <Text style={[webStyles.emptyTitle, { color: cores.texto }]}>Crie sua primeira meta</Text>
            <Text style={[webStyles.emptyText, { color: cores.textoSecundario }]}>Planeje uma viagem, uma reserva ou qualquer objetivo que queira alcançar.</Text>
            <TouchableOpacity style={webStyles.emptyButton} onPress={() => navigation.navigate('AdicionarMeta')} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color="#fff" /><Text style={webStyles.emptyButtonText}>Nova meta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={webStyles.grid}>
            {metas.map((meta) => {
              const progresso = meta.valorObjetivo > 0 ? Math.min(meta.valorGuardado / meta.valorObjetivo, 1) : 0;
              const restante = meta.valorObjetivo - meta.valorGuardado;
              const meses = meta.aporteMensal > 0 && restante > 0 ? Math.ceil(restante / meta.aporteMensal) : null;
              return (
                <TouchableOpacity
                  key={meta.id}
                  style={[webStyles.card, { backgroundColor: cores.card }]}
                  activeOpacity={0.82}
                  onPress={() => navigation.navigate('DetalhesMeta', { metaId: meta.id })}
                >
                  <View style={webStyles.cardTop}>
                    <View style={[webStyles.cardIcon, { backgroundColor: cores.fundoIcone }]}><Ionicons name={meta.icone} size={17} color={cores.primario} /></View>
                    <Text style={[webStyles.percent, { color: cores.primario }]}>{Math.round(progresso * 100)}%</Text>
                  </View>
                  <Text numberOfLines={1} style={[webStyles.cardName, { color: cores.texto }]}>{meta.nome}</Text>
                  <View style={[webStyles.track, { backgroundColor: cores.fundo }]}><View style={[webStyles.progress, { width: `${progresso * 100}%`, backgroundColor: cores.primario }]} /></View>
                  <View style={webStyles.amounts}>
                    <Text style={[webStyles.amount, { color: cores.texto }]}>{real(meta.valorGuardado)}</Text>
                    <Text style={[webStyles.amountMuted, { color: cores.textoSecundario }]}>de {real(meta.valorObjetivo)}</Text>
                  </View>
                  {meta.aporteMensal > 0 && <Text style={[webStyles.contribution, { color: cores.textoSecundario }]}>{real(meta.aporteMensal)}/mês{meses !== null ? ` · cerca de ${meses} ${meses === 1 ? 'mês' : 'meses'}` : ''}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48, maxWidth: 1240, width: '100%', alignSelf: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#F1EBF8', alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 10 },
  summaryValue: { fontSize: 18, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginTop: 2 },
  summaryCount: { marginLeft: 'auto', fontSize: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { width: 270, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(134,101,181,0.08)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 11, fontWeight: '700' },
  cardName: { fontSize: 13, fontWeight: '700', marginTop: 13, marginBottom: 11 },
  track: { height: 6, borderRadius: 999, overflow: 'hidden' },
  progress: { height: 6, borderRadius: 999 },
  amounts: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 9 },
  amount: { fontSize: 12, fontWeight: '700' },
  amountMuted: { fontSize: 10 },
  contribution: { fontSize: 9, marginTop: 7 },
  empty: { alignItems: 'center', padding: 32, borderRadius: 18 },
  emptyIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1EBF8' },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptyText: { maxWidth: 360, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  emptyButton: { height: 36, borderRadius: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8665B5', marginTop: 14 },
  emptyButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 16, fontWeight: '600' },
  scroll: { padding: 16, paddingTop: 0, paddingBottom: 90 },
  vazio: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  vazioTitulo: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  vazioTexto: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTopoEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardNome: { fontSize: 14, fontWeight: '500' },
  cardPorcentagem: { fontSize: 12 },
  trilho: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progresso: { height: '100%', borderRadius: 4 },
  cardValores: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardValorTexto: { fontSize: 12 },
  cardAporte: { fontSize: 12 },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fabTexto: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
