import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';

const NOMES_MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export default function MonthPickerScreen({ navigation }) {
  const { ano, mes, irPara } = useMes();
  const { cores } = useTema();
  const [anoVisualizado, setAnoVisualizado] = useState(ano);

  function selecionar(mesIndex) {
    irPara(anoVisualizado, mesIndex);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={24} color={cores.texto} />
        </TouchableOpacity>
        <Text style={[styles.headerTitulo, { color: cores.texto }]}>Selecionar mês</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.seletorAno}>
        <TouchableOpacity onPress={() => setAnoVisualizado((a) => a - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={cores.textoSecundario} />
        </TouchableOpacity>
        <Text style={[styles.anoTexto, { color: cores.texto }]}>{anoVisualizado}</Text>
        <TouchableOpacity onPress={() => setAnoVisualizado((a) => a + 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-forward" size={22} color={cores.textoSecundario} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {NOMES_MESES.map((nomeMes, index) => {
          const selecionado = anoVisualizado === ano && index === mes;
          return (
            <TouchableOpacity
              key={nomeMes}
              style={[styles.mesBotao, { borderColor: cores.borda }, selecionado && { backgroundColor: cores.primario, borderColor: cores.primario }]}
              onPress={() => selecionar(index)}
            >
              <Text style={[styles.mesTexto, { color: cores.texto }, selecionado && styles.mesTextoSelecionado]}>{nomeMes}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    paddingVertical: 16,
  },
  anoTexto: { fontSize: 20, fontWeight: '600', minWidth: 70, textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  mesBotao: {
    width: '30%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesTexto: { fontSize: 14, fontWeight: '500' },
  mesTextoSelecionado: { color: '#fff' },
});