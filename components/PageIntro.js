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
  container: { marginBottom: 20 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginBottom: 6 },
  titulo: { fontSize: 28, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 6 },
  subtitulo: { fontSize: 14, lineHeight: 20, maxWidth: 560 },
});
