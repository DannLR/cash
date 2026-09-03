import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getProximosLancamentos, calcularResumoMensal } from '../database/queries';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';

function formatarReal(valor) {
  const abs = Math.abs(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return valor < 0 ? `-${abs}` : `+${abs}`;
}

export default function PlanningScreen() {
  const { ano, mes, referencia } = useMes();
  const { cores } = useTema();
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