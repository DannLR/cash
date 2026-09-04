import { View, Text, StyleSheet } from 'react-native';

export default function PageIntro({ kicker, titulo, subtitulo, cores }) {
  return (
    <View style={styles.container}>
      <Text style={[styles.kicker, { color: cores.primario }]}>{kicker}</Text>
      <Text style={[styles.titulo, { color: cores.texto }]}>{titulo}</Text>
      {subtitulo ? <Text style={[styles.subtitulo, { color: cores.textoSecundario }]}>{subtitulo}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 28 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  titulo: { fontSize: 32, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 8 },
  subtitulo: { fontSize: 15, lineHeight: 22, maxWidth: 560 },
});
