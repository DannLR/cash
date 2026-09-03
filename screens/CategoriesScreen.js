import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCategorias,
  renomearCategoria,
  getContasVinculadasACategoria,
  reatribuirContasRecorrentes,
  excluirCategoria,
  atualizarIconeCorCategoria,
} from '../database/queries';
import { useTema } from '../context/ThemeContext';

const ICONES = [
  'home-outline', 'flash-outline', 'wifi-outline', 'water-outline',
  'barbell-outline', 'refresh-outline', 'cart-outline', 'car-outline',
  'restaurant-outline', 'game-controller-outline', 'bag-outline', 'pricetag-outline',
  'cash-outline', 'trending-up-outline', 'gift-outline', 'airplane-outline',
  'medkit-outline', 'paw-outline', 'school-outline', 'construct-outline',
];

const CORES_CATEGORIA = [
  '#0F766E', '#16803C', '#2563EB', '#7C3AED',
  '#DB2777', '#EA580C', '#DC2626', '#B25E09',
  '#0891B2', '#9333EA', '#C026D3', '#4B5563',
];

export default function CategoriesScreen({ navigation }) {
  const { cores } = useTema();
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');

  // Estado do seletor de ícone/cor (abre num modal ao tocar no círculo).
  const [personalizando, setPersonalizando] = useState(null);
  const [iconeEscolhido, setIconeEscolhido] = useState('pricetag-outline');
  const [corEscolhida, setCorEscolhida] = useState('#0F766E');

  // Estado do fluxo de exclusão com vínculo (aparece por cima da lista
  // quando a categoria selecionada está presa a alguma conta recorrente).
  const [confirmando, setConfirmando] = useState(null); // categoria sendo excluída
  const [vinculos, setVinculos] = useState([]);
  const [categoriaDestino, setCategoriaDestino] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    const lista = await getCategorias();
    setCategorias(lista);
    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  function iniciarEdicao(categoria) {
    setEditandoId(categoria.id);
    setNomeEditado(categoria.nome);
  }

  async function salvarEdicao(categoria) {
    if (nomeEditado.trim()) {
      await renomearCategoria(categoria.id, nomeEditado.trim());
    }
    setEditandoId(null);
    carregar();
  }

  function abrirPersonalizar(categoria) {
    setIconeEscolhido(categoria.icone || 'pricetag-outline');
    setCorEscolhida(categoria.cor || '#0F766E');
    setPersonalizando(categoria);
  }

  async function salvarPersonalizacao() {
    await atualizarIconeCorCategoria(personalizando.id, { icone: iconeEscolhido, cor: corEscolhida });
    setPersonalizando(null);
    carregar();
  }

  async function tentarExcluir(categoria) {
    setErro('');
    if (categoria.padrao) {
      setErro('Categorias padrão não podem ser excluídas, só renomeadas.');
      return;
    }
    const lista = await getContasVinculadasACategoria(categoria.id);
    setVinculos(lista);
    setCategoriaDestino(null);
    setConfirmando(categoria);
  }

  async function confirmarExclusao() {
    if (vinculos.length > 0) {
      if (!categoriaDestino) return;
      await reatribuirContasRecorrentes(confirmando.id, categoriaDestino);
    }
    await excluirCategoria(confirmando.id);
    setConfirmando(null);
    carregar();
  }

  if (carregando) {
    return (
      <SafeAreaView style={[styles.container, styles.centro, { backgroundColor: cores.fundo }]}>
        <ActivityIndicator size="large" color={cores.primario} />
      </SafeAreaView>
    );
  }

  // Opções válidas para mover as contas vinculadas: mesmo tipo, exceto a
  // própria categoria que está sendo excluída.
  const opcoesDestino = confirmando
    ? categorias.filter((c) => c.tipo === confirmando.tipo && c.id !== confirmando.id)
    : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={cores.texto} />
        </TouchableOpacity>
        <Text style={[styles.headerTitulo, { color: cores.texto }]}>Categorias</Text>
        <View style={{ width: 22 }} />
      </View>

      {erro !== '' && (
        <View style={styles.erroBox}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      )}

      {confirmando && (
        <View style={[styles.confirmBox, { backgroundColor: cores.card }]}>
          {vinculos.length === 0 ? (
            <>
              <Text style={[styles.confirmTitulo, { color: cores.texto }]}>Excluir "{confirmando.nome}"?</Text>
              <Text style={[styles.confirmTexto, { color: cores.textoSecundario }]}>
                Movimentações já lançadas nessa categoria passam a aparecer como "Outros".
              </Text>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <Ionicons name="link-outline" size={18} color="#B25E09" />
                <Text style={[styles.confirmTitulo, { color: cores.texto }]}>Categoria "{confirmando.nome}" está vinculada</Text>
              </View>
              <Text style={[styles.confirmTexto, { color: cores.textoSecundario }]}>
                {vinculos.map((v) => v.nome).join(', ')} {vinculos.length > 1 ? 'usam' : 'usa'} essa categoria automaticamente.
              </Text>
              <Text style={[styles.confirmTexto, { color: cores.textoSecundario, marginTop: 10, marginBottom: 6 }]}>Mover para:</Text>
              <View style={styles.opcoesDestino}>
                {opcoesDestino.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.opcaoDestino, { borderColor: cores.borda }, categoriaDestino === c.id && { backgroundColor: cores.primario, borderColor: cores.primario }]}
                    onPress={() => setCategoriaDestino(c.id)}
                  >
                    <Text style={[styles.opcaoDestinoTexto, { color: cores.texto }, categoriaDestino === c.id && { color: '#fff' }]}>
                      {c.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={styles.confirmBotoes}>
            <TouchableOpacity style={[styles.botaoCancelar, { borderColor: cores.borda }]} onPress={() => setConfirmando(null)}>
              <Text style={[styles.botaoCancelarTexto, { color: cores.texto }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.botaoExcluir,
                vinculos.length > 0 && !categoriaDestino && styles.botaoDesabilitado,
              ]}
              onPress={confirmarExclusao}
              disabled={vinculos.length > 0 && !categoriaDestino}
            >
              <Text style={styles.botaoExcluirTexto}>
                {vinculos.length > 0 ? 'Mover e excluir' : 'Excluir'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {categorias.map((categoria) => (
          <View key={categoria.id} style={[styles.item, { borderBottomColor: cores.borda }]}>
            {editandoId === categoria.id ? (
              <>
                <TextInput
                  style={[styles.inputEdicao, { borderColor: cores.borda, color: cores.texto }]}
                  value={nomeEditado}
                  onChangeText={setNomeEditado}
                  autoFocus
                />
                <TouchableOpacity style={[styles.botaoSalvar, { backgroundColor: cores.primario }]} onPress={() => salvarEdicao(categoria)}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.itemInfo}>
                  <TouchableOpacity
                    style={[styles.iconeCirculo, { backgroundColor: categoria.cor || cores.primario }]}
                    onPress={() => abrirPersonalizar(categoria)}
                  >
                    <Ionicons name={categoria.icone || 'pricetag-outline'} size={16} color="#fff" />
                  </TouchableOpacity>
                  <Text style={[styles.itemNome, { color: cores.texto }]}>{categoria.nome}</Text>
                  {!!categoria.padrao && (
                    <View style={[styles.selo, { borderColor: cores.borda }]}>
                      <Text style={[styles.seloTexto, { color: cores.textoSecundario }]}>padrão</Text>
                    </View>
                  )}
                </View>
                <View style={styles.itemAcoes}>
                  <TouchableOpacity onPress={() => iniciarEdicao(categoria)} style={styles.botaoAcao}>
                    <Ionicons name="pencil-outline" size={18} color={cores.textoSecundario} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => tentarExcluir(categoria)} style={styles.botaoAcao}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!personalizando} transparent animationType="fade" onRequestClose={() => setPersonalizando(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { backgroundColor: cores.card }]}>
            <View style={styles.modalTopo}>
              <View style={[styles.iconeCirculo, styles.iconeCirculoGrande, { backgroundColor: corEscolhida }]}>
                <Ionicons name={iconeEscolhido} size={22} color="#fff" />
              </View>
              <Text style={[styles.modalTitulo, { color: cores.texto }]}>{personalizando?.nome}</Text>
            </View>

            <Text style={[styles.modalRotulo, { color: cores.textoSecundario }]}>Ícone</Text>
            <View style={styles.grid}>
              {ICONES.map((nome) => (
                <TouchableOpacity
                  key={nome}
                  style={[styles.opcaoIcone, { borderColor: cores.borda }, iconeEscolhido === nome && { backgroundColor: corEscolhida, borderColor: corEscolhida }]}
                  onPress={() => setIconeEscolhido(nome)}
                >
                  <Ionicons name={nome} size={18} color={iconeEscolhido === nome ? '#fff' : cores.texto} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalRotulo, { color: cores.textoSecundario, marginTop: 14 }]}>Cor</Text>
            <View style={styles.grid}>
              {CORES_CATEGORIA.map((cor) => (
                <TouchableOpacity
                  key={cor}
                  style={[styles.opcaoCor, { backgroundColor: cor }, corEscolhida === cor && styles.opcaoCorSelecionada]}
                  onPress={() => setCorEscolhida(cor)}
                >
                  {corEscolhida === cor && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBotoes}>
              <TouchableOpacity style={[styles.botaoCancelar, { borderColor: cores.borda }]} onPress={() => setPersonalizando(null)}>
                <Text style={[styles.botaoCancelarTexto, { color: cores.texto }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botaoModalSalvar, { backgroundColor: cores.primario }]} onPress={salvarPersonalizacao}>
                <Text style={styles.botaoModalSalvarTexto}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  headerTitulo: { fontSize: 15, fontWeight: '500' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  erroBox: { backgroundColor: '#FEE2E2', marginHorizontal: 16, borderRadius: 10, padding: 12, marginBottom: 8 },
  erroTexto: { fontSize: 13, color: '#B91C1C' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconeCirculo: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconeCirculoGrande: { width: 44, height: 44, borderRadius: 22 },
  itemNome: { fontSize: 14 },
  selo: { borderWidth: 0.5, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  seloTexto: { fontSize: 10 },
  itemAcoes: { flexDirection: 'row', gap: 14 },
  botaoAcao: { padding: 4 },
  inputEdicao: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 10,
    fontSize: 14,
    marginRight: 8,
  },
  botaoSalvar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBox: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  confirmTitulo: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  confirmTexto: { fontSize: 12, lineHeight: 18 },
  opcoesDestino: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opcaoDestino: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 32,
    justifyContent: 'center',
  },
  opcaoDestinoTexto: { fontSize: 12 },
  confirmBotoes: { flexDirection: 'row', gap: 8, marginTop: 14 },
  botaoCancelar: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoCancelarTexto: { fontSize: 13 },
  botaoExcluir: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoDesabilitado: { backgroundColor: '#F0B4B4' },
  botaoExcluirTexto: { fontSize: 13, color: '#fff', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { borderRadius: 16, padding: 20, width: '100%' },
  modalTopo: { alignItems: 'center', marginBottom: 18 },
  modalTitulo: { fontSize: 15, fontWeight: '600', marginTop: 10 },
  modalRotulo: { fontSize: 12, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcaoIcone: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  opcaoCor: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  opcaoCorSelecionada: { borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  modalBotoes: { flexDirection: 'row', gap: 10, marginTop: 20 },
  botaoModalSalvar: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  botaoModalSalvarTexto: { fontSize: 14, color: '#fff', fontWeight: '600' },
});