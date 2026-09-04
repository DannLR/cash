import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getTotalAssinaturas,
  getComparacaoCategorias,
  getSugestoesEconomia,
  getMapaCategorias,
} from '../database/queries';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';
import WebPageHeader from '../components/WebPageHeader';
import PageIntro from '../components/PageIntro';

function formatarReal(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function InsightsScreen({ navigation }) {
  const { ano, mes } = useMes();
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web' && width >= 768;
  const [totalAssinaturas, setTotalAssinaturas] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [mapaCategorias, setMapaCategorias] = useState({});
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      async function carregar() {
        setCarregando(true);
        const [total, comparacao, sugestoesEconomia, mapa] = await Promise.all([
          getTotalAssinaturas(),
          getComparacaoCategorias(ano, mes),
          getSugestoesEconomia(ano, mes),
          getMapaCategorias(),
        ]);
        if (ativo) {
          setTotalAssinaturas(total);
          setCategorias(comparacao);
          setSugestoes(sugestoesEconomia);
          setMapaCategorias(mapa);
          setCarregando(false);
        }
      }
      carregar();
      return () => { ativo = false; };
    }, [ano, mes])
  );

  if (carregando) {
    return (
      <SafeAreaView style={[styles.container, styles.centro, { backgroundColor: cores.fundo }]}>
        <ActivityIndicator size="large" color={cores.primario} />
      </SafeAreaView>
    );
  }

  const maiorValor = Math.max(1, ...categorias.flatMap((c) => [c.atual, c.anterior]));

  if (web) {
    return (
      <InsightsWeb
        cores={cores}
        navigation={navigation}
        totalAssinaturas={totalAssinaturas}
        categorias={categorias}
        sugestoes={sugestoes}
        mapaCategorias={mapaCategorias}
        maiorValor={maiorValor}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={[styles.cardAssinaturas, { backgroundColor: cores.card }]} activeOpacity={0.7} onPress={() => navigation.navigate('Assinaturas')}>
          <View style={styles.cardAssinaturasTopo}>
            <View>
              <Text style={[styles.cardLabel, { color: cores.textoSecundario }]}>Assinaturas recorrentes</Text>
              <Text style={[styles.cardValor, { color: cores.texto }]}>
                {formatarReal(totalAssinaturas)} <Text style={[styles.cardValorSufixo, { color: cores.textoSecundario }]}>/mês</Text>
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={cores.textoSecundario} />
          </View>
        </TouchableOpacity>

        <Text style={[styles.secaoTitulo, { color: cores.textoSecundario }]}>Comparação por categoria</Text>
        {categorias.length === 0 ? (
          <Text style={[styles.vazio, { color: cores.textoSecundario }]}>
            Ainda não há dados suficientes para comparar meses.
          </Text>
        ) : (
          <View style={[styles.cardComparacao, { backgroundColor: cores.card }]}>
            {categorias.map((c, i) => {
              const subiuMuito = c.anterior > 0 && c.atual > c.anterior;
              const cor = subiuMuito ? '#DC2626' : c.atual < c.anterior ? '#16A34A' : cores.primario;
              const info = mapaCategorias[`saida:${c.nome}`];
              return (
                <View key={i} style={styles.linhaCategoria}>
                  <View style={styles.linhaCategoriaHeader}>
                    <View style={styles.categoriaNomeLinha}>
                      {!!info && (
                        <View style={[styles.iconeMini, { backgroundColor: info.cor }]}>
                          <Ionicons name={info.icone} size={11} color="#fff" />
                        </View>
                      )}
                      <Text style={[styles.categoriaNome, { color: cores.texto }]}>{c.nome}</Text>
                    </View>
                    <Text style={[styles.categoriaValores, { color: cores.textoSecundario }, subiuMuito && { color: '#DC2626', fontWeight: '500' }]}>
                      {formatarReal(c.anterior)} → {formatarReal(c.atual)}
                    </Text>
                  </View>
                  <View style={styles.barras}>
                    <View style={[styles.barra, { width: `${(c.anterior / maiorValor) * 100}%`, backgroundColor: '#D1D1D6' }]} />
                    <View style={[styles.barra, { width: `${(c.atual / maiorValor) * 100}%`, backgroundColor: cor }]} />
                  </View>
                </View>
              );
            })}
            <View style={styles.legenda}>
              <View style={styles.legendaItem}>
                <View style={[styles.legendaCor, { backgroundColor: '#D1D1D6' }]} />
                <Text style={[styles.legendaTexto, { color: cores.textoSecundario }]}>mês passado</Text>
              </View>
              <View style={styles.legendaItem}>
                <View style={[styles.legendaCor, { backgroundColor: cores.primario }]} />
                <Text style={[styles.legendaTexto, { color: cores.textoSecundario }]}>este mês</Text>
              </View>
            </View>
          </View>
        )}

        {sugestoes.length > 0 && (
          <>
            <Text style={[styles.secaoTitulo, { color: cores.textoSecundario }]}>Sugestões de economia</Text>
            {sugestoes.map((texto, i) => (
              <View key={i} style={styles.sugestao}>
                <Text style={styles.sugestaoTexto}>{texto}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InsightsWeb({ cores, navigation, totalAssinaturas, categorias, sugestoes, mapaCategorias, maiorValor }) {
  return (
    <SafeAreaView style={[webStyles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={webStyles.scrollContent}>
        <WebPageHeader acaoTexto="Novo lançamento" aoAcionar={() => navigation.navigate('AdicionarMovimentacao')} />
        <PageIntro
          kicker="DECISÕES MELHORES"
          titulo="Insights"
          subtitulo="Compare hábitos de consumo e encontre espaço para respirar."
          cores={cores}
        />

        <TouchableOpacity
          style={[webStyles.cardAssinaturas, { backgroundColor: cores.card }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Assinaturas')}
        >
          <View style={[webStyles.iconeAssinaturas, { backgroundColor: cores.fundo }]}>
            <Ionicons name="sync-outline" size={17} color={cores.primario} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[webStyles.cardLabel, { color: cores.textoSecundario }]}>Assinaturas recorrentes</Text>
            <Text style={[webStyles.cardValor, { color: cores.texto }]}>
              {formatarReal(totalAssinaturas)} <Text style={[webStyles.cardValorSufixo, { color: cores.textoSecundario }]}>/mês</Text>
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={cores.textoSecundario} />
        </TouchableOpacity>

        <View style={webStyles.linha}>
          <View style={[webStyles.cardComparacao, { backgroundColor: cores.card }]}>
            <View style={webStyles.comparacaoTopo}>
              <View>
                <Text style={[webStyles.tituloCard, { color: cores.texto }]}>Comparação por categoria</Text>
                <Text style={[webStyles.subtituloCard, { color: cores.textoSecundario }]}>Mês atual versus mês passado</Text>
              </View>
              <Ionicons name="bar-chart-outline" size={18} color={cores.primario} />
            </View>

            {categorias.length === 0 ? (
              <Text style={[webStyles.vazio, { color: cores.textoSecundario }]}>
                Ainda não há dados suficientes para comparar meses.
              </Text>
            ) : (
              <>
                {categorias.map((c, i) => {
                  const subiuMuito = c.anterior > 0 && c.atual > c.anterior;
                  const cor = subiuMuito ? '#DC2626' : c.atual < c.anterior ? '#16A34A' : cores.primario;
                  return (
                    <View key={i} style={webStyles.linhaCategoria}>
                      <View style={webStyles.linhaCategoriaHeader}>
                        <Text style={[webStyles.categoriaNome, { color: cores.texto }]}>{c.nome}</Text>
                        <Text style={[webStyles.categoriaValor, { color: cor }]}>
                          {c.atual >= c.anterior ? '↑' : '↓'} {formatarReal(Math.abs(c.atual - c.anterior))}
                        </Text>
                      </View>
                      <View style={[webStyles.barraFundo, { backgroundColor: cores.fundo }]}>
                        <View style={[webStyles.barra, { width: `${(c.anterior / maiorValor) * 100}%`, backgroundColor: '#D1D1D6' }]} />
                      </View>
                      <View style={[webStyles.barraFundo, { backgroundColor: cores.fundo, marginTop: 4 }]}>
                        <View style={[webStyles.barra, { width: `${(c.atual / maiorValor) * 100}%`, backgroundColor: cor }]} />
                      </View>
                      <View style={webStyles.linhaValoresExtremos}>
                        <Text style={[webStyles.valorExtremo, { color: cores.textoSecundario }]}>{formatarReal(c.anterior)}</Text>
                        <Text style={[webStyles.valorExtremo, { color: cores.textoSecundario }]}>{formatarReal(c.atual)}</Text>
                      </View>
                    </View>
                  );
                })}
                <View style={webStyles.legenda}>
                  <View style={webStyles.legendaItem}>
                    <View style={[webStyles.legendaCor, { backgroundColor: '#D1D1D6' }]} />
                    <Text style={[webStyles.legendaTexto, { color: cores.textoSecundario }]}>MÊS PASSADO</Text>
                  </View>
                  <View style={webStyles.legendaItem}>
                    <View style={[webStyles.legendaCor, { backgroundColor: cores.primario }]} />
                    <Text style={[webStyles.legendaTexto, { color: cores.textoSecundario }]}>ESTE MÊS</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={[webStyles.cardSugestoes, { backgroundColor: cores.card }]}>
            <View style={webStyles.sugestoesTopo}>
              <View style={[webStyles.iconeSugestoes, { backgroundColor: '#FEF3E2' }]}>
                <Ionicons name="bulb-outline" size={17} color="#B25E09" />
              </View>
              <View>
                <Text style={[webStyles.tituloCard, { color: cores.texto }]}>Sugestões de economia</Text>
                <Text style={[webStyles.subtituloCard, { color: cores.textoSecundario }]}>Pequenos ajustes, mais espaço</Text>
              </View>
            </View>
            {sugestoes.length === 0 ? (
              <Text style={[webStyles.sugestaoVazia, { color: cores.textoSecundario }]}>Você está dentro do ritmo do mês.</Text>
            ) : (
              sugestoes.map((texto, i) => (
                <View key={i} style={webStyles.sugestao}>
                  <Text style={webStyles.sugestaoTexto}>{texto}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 60, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  cardAssinaturas: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 18, padding: 20, marginBottom: 20,
  },
  iconeAssinaturas: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 12, marginBottom: 3 },
  cardValor: { fontSize: 20, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' },
  cardValorSufixo: { fontSize: 13, fontWeight: '400', fontFamily: 'DM Sans, sans-serif' },
  linha: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  cardComparacao: { flex: 1.6, borderRadius: 20, padding: 24 },
  comparacaoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  tituloCard: { fontSize: 16, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' },
  subtituloCard: { fontSize: 12, marginTop: 2 },
  vazio: { fontSize: 13, paddingVertical: 10 },
  linhaCategoria: { marginBottom: 18 },
  linhaCategoriaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  categoriaNome: { fontSize: 13, fontWeight: '600' },
  categoriaValor: { fontSize: 12, fontWeight: '600' },
  barraFundo: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barra: { height: 6, borderRadius: 3 },
  linhaValoresExtremos: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  valorExtremo: { fontSize: 10 },
  legenda: { flexDirection: 'row', gap: 16, marginTop: 4 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendaCor: { width: 7, height: 7, borderRadius: 2 },
  legendaTexto: { fontSize: 10, letterSpacing: 0.5 },
  cardSugestoes: { flex: 1, borderRadius: 20, padding: 24 },
  sugestoesTopo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconeSugestoes: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sugestaoVazia: { fontSize: 13 },
  sugestao: { backgroundColor: '#FEF3E2', borderRadius: 12, padding: 14, marginBottom: 8 },
  sugestaoTexto: { fontSize: 13, color: '#B25E09', lineHeight: 19 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  cardAssinaturas: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardAssinaturasTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 13, marginBottom: 4 },
  cardValor: { fontSize: 20, fontWeight: '600' },
  cardValorSufixo: { fontSize: 13, fontWeight: '400' },
  secaoTitulo: { fontSize: 13, marginBottom: 10 },
  vazio: { fontSize: 13, paddingVertical: 10 },
  cardComparacao: { borderRadius: 12, padding: 16, marginBottom: 16 },
  linhaCategoria: { marginBottom: 14 },
  linhaCategoriaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  categoriaNomeLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconeMini: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  categoriaNome: { fontSize: 13 },
  categoriaValores: { fontSize: 12 },
  barras: { gap: 3 },
  barra: { height: 8, borderRadius: 4 },
  legenda: { flexDirection: 'row', gap: 14, marginTop: 4 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendaCor: { width: 8, height: 8, borderRadius: 2 },
  legendaTexto: { fontSize: 11 },
  sugestao: { backgroundColor: '#FEF3E2', borderRadius: 12, padding: 14, marginBottom: 8 },
  sugestaoTexto: { fontSize: 13, color: '#B25E09', lineHeight: 19 },
});