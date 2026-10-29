import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../context/ThemeContext';

// Tela de loading usada enquanto o app inicializa (ex: abrindo o banco de
// dados pela primeira vez). Mostra a marca "cash" com um spinner girando —
// separado da splash nativa, que aparece antes mesmo do JS carregar.
export default function LoadingScreen() {
  const { cores } = useTema();
  const rotacao = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotacao, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotacao]);

  const rotacaoInterpolada = rotacao.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { backgroundColor: cores.fundo }]}>
      <Ionicons name="trending-up" size={26} color={cores.primario} style={{ marginBottom: 10 }} />
      <Text style={[styles.marca, { color: cores.texto }]}>cash</Text>
      <Animated.View style={[styles.spinner, { borderColor: cores.borda, borderTopColor: cores.primario, transform: [{ rotate: rotacaoInterpolada }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  marca: { fontSize: 24, fontWeight: '500', letterSpacing: 4, marginBottom: 24 },
  spinner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
  },
});