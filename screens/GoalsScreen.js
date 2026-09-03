import React, { useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMetas } from '../database/queries';
import { useTema } from '../context/ThemeContext';

const real = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function GoalsScreen({ navigation }) {
  const { cores } = useTema();
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