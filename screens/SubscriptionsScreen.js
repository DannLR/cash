import React, { useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getAssinaturasComCartao } from '../database/queries';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';

const real = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SubscriptionsScreen({ navigation }) {
  const { referencia } = useMes();
  const { cores } = useTema();
  const [assinaturas, setAssinaturas] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      getAssinaturasComCartao(referencia).then((r) => ativo && setAssinaturas(r));
      return () => { ativo = false; };
    }, [referencia])
  );

  if (!assinaturas) {
    return (
      <SafeAreaView style={[styles.centro, { backgroundColor: cores.fundo }]}>
        <ActivityIndicator size="large" color={cores.primario} />
      </SafeAreaView>
    );
  }

  const total = assinaturas.reduce((soma, a) => soma + a.valor, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={cores.texto} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: cores.texto }]}>Assinaturas</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.cardTotal, { backgroundColor: cores.card }]}>
          <Text style={[styles.cardLabel, { color: cores.textoSecundario }]}>Total em assinaturas</Text>
          <Text style={[styles.cardValor, { color: cores.texto }]}>
            {real(total)} <Text style={[styles.cardValorSufixo, { color: cores.textoSecundario }]}>/mês</Text>
          </Text>
        </View>

        {assinaturas.length === 0 ? (
          <Text style={[styles.vazio, { color: cores.textoSecundario }]}>Nenhuma assinatura cadastrada ainda.</Text>
        ) : (
          assinaturas.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.item, { backgroundColor: cores.card }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('EditarLancamentos', { modo: 'recorrente', contaId: a.id })}
            >
              <View style={styles.itemEsquerda}>
                <View style={[styles.itemIcone, { backgroundColor: cores.fundoIcone }]}>
                  <Ionicons name="refresh-outline" size={16} color={cores.primario} />
                </View>
                <View>
                  <Text style={[styles.itemNome, { color: cores.texto }]}>{a.nome}</Text>
                  <View style={styles.itemSubLinha}>
                    <Ionicons name="card-outline" size={12} color={cores.textoSecundario} />
                    <Text style={[styles.itemSub, { color: cores.textoSecundario }]}>
                      {a.cartaoApelido || 'Sem cartão vinculado'} · dia {a.diaVencimento}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.itemValor, { color: cores.texto }]}>{real(a.valor)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 16, fontWeight: '600' },
  scroll: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  cardTotal: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardLabel: { fontSize: 13, marginBottom: 4 },
  cardValor: { fontSize: 22, fontWeight: '600' },
  cardValorSufixo: { fontSize: 13, fontWeight: '400' },
  vazio: { fontSize: 13, textAlign: 'center', paddingVertical: 30 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  itemEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemIcone: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemNome: { fontSize: 14, fontWeight: '500' },
  itemSubLinha: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  itemSub: { fontSize: 12 },
  itemValor: { fontSize: 14, fontWeight: '600' },
});