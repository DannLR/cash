import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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

function formatarReal(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function InsightsScreen({ navigation }) {
  const { ano, mes } = useMes();
  const { cores } = useTema();
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