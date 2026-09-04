import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';

/**
 * Cabeçalho compartilhado entre as telas na versão web (desktop): mostra
 * o mês atual com setas pra navegar, o botão de tema claro/escuro, e um
 * botão de ação à direita (customizável por tela — "Novo lançamento",
 * "Novo gasto" etc). Réplica do cabeçalho fixo que o site original tinha
 * em todas as páginas.
 */
export default function WebPageHeader({ acaoTexto, acaoIcone = 'add', aoAcionar }) {
  const { label, mesAnterior, proximoMes } = useMes();
  const { cores, modoEscuro, alternarTema } = useTema();

  return (
    <View style={styles.topo}>
      <Text style={[styles.kicker, { color: cores.textoSecundario }]}>VISÃO FINANCEIRA MENSAL</Text>
      <View style={styles.direita}>
        <View style={[styles.seletorMes, { backgroundColor: cores.card, borderColor: cores.borda }]}>
          <TouchableOpacity onPress={mesAnterior} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={15} color={cores.textoSecundario} />
          </TouchableOpacity>
          <Text style={[styles.mesTexto, { color: cores.texto }]}>{label}</Text>
          <TouchableOpacity onPress={proximoMes} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-forward" size={15} color={cores.textoSecundario} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={alternarTema}
          style={[styles.themeBotao, { backgroundColor: cores.card }]}
          activeOpacity={0.7}
        >
          <Ionicons name={modoEscuro ? 'sunny-outline' : 'moon-outline'} size={16} color={cores.textoSecundario} />
        </TouchableOpacity>
        {acaoTexto && (
          <TouchableOpacity
            style={[styles.botaoAcao, { backgroundColor: cores.primario }]}
            onPress={aoAcionar}
            activeOpacity={0.85}
          >
            <Ionicons name={acaoIcone} size={16} color="#fff" />
            <Text style={styles.botaoAcaoTexto}>{acaoTexto}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  direita: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seletorMes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 36,
  },
  mesTexto: { fontSize: 13, fontWeight: '600' },
  themeBotao: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  botaoAcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    height: 36,
    paddingHorizontal: 16,
  },
  botaoAcaoTexto: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
