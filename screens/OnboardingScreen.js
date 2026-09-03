import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../context/ThemeContext';

const SLIDES = [
  {
    icone: 'trending-up',
    titulo: 'Bem-vindo ao cash',
    texto: 'Seu controle financeiro pessoal: saldo, contas, cartões e metas, tudo num só lugar — guardado só no seu aparelho.',
  },
  {
    icone: 'shield-checkmark-outline',
    titulo: 'Saldo Livre Real',
    texto: 'Mais do que o saldo da conta: é quanto sobra depois de descontar tudo que ainda vai vencer no mês. É esse número que te diz o que é seguro gastar.',
  },
  {
    icone: 'flag-outline',
    titulo: 'Metas',
    texto: 'Defina objetivos como entrada de apartamento ou uma viagem, acompanhe o progresso e ajuste o ritmo sempre que quiser atingir mais rápido.',
  },
  {
    icone: 'checkmark-done-outline',
    titulo: 'Vamos começar',
    texto: 'Toque no mês na tela inicial pra navegar entre períodos, e no botão + pra lançar sua primeira movimentação.',
  },
];

export default function OnboardingScreen({ onFinalizar }) {
  const { cores } = useTema();
  const [passo, setPasso] = useState(0);
  const slide = SLIDES[passo];
  const ultimo = passo === SLIDES.length - 1;

  function avancar() {
    if (ultimo) {
      onFinalizar();
    } else {
      setPasso(passo + 1);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      {!ultimo && (
        <TouchableOpacity style={styles.pular} onPress={onFinalizar} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.pularTexto, { color: cores.textoSecundario }]}>Pular</Text>
        </TouchableOpacity>
      )}

      <View style={styles.conteudo}>
        <View style={[styles.iconeBox, { backgroundColor: cores.primario }]}>
          <Ionicons name={slide.icone} size={34} color="#fff" />
        </View>
        <Text style={[styles.titulo, { color: cores.texto }]}>{slide.titulo}</Text>
        <Text style={[styles.texto, { color: cores.textoSecundario }]}>{slide.texto}</Text>
      </View>

      <View style={styles.rodape}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i === passo ? cores.primario : cores.borda }]}
            />
          ))}
        </View>
        <TouchableOpacity style={[styles.botao, { backgroundColor: cores.primario }]} onPress={avancar}>
          <Text style={styles.botaoTexto}>{ultimo ? 'Começar' : 'Continuar'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingVertical: 24, paddingHorizontal: 36 },
  pular: { alignSelf: 'flex-start', marginTop: 8, marginLeft: 8, paddingVertical: 8, paddingHorizontal: 6 },
  pularTexto: { fontSize: 14 },
  conteudo: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  iconeBox: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  titulo: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  texto: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  rodape: { paddingBottom: 24, paddingHorizontal: 8, alignItems: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 22 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  botao: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '72%' },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
});