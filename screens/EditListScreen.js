import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CampoData from '../components/CampoData';
import { useFocusEffect } from '@react-navigation/native';
import {
  getMovimentacoesPorTipo,
  atualizarMovimentacao,
  excluirMovimentacao,
  getContasRecorrentesEditaveis,
  atualizarContaRecorrente,
  excluirContaRecorrente,
  alternarContaPaga,
  getCategorias,
} from '../database/queries';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';

function formatarReal(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarValorInput(texto) {
  const somenteDigitos = texto.replace(/\D/g, '');
  if (!somenteDigitos) return '';
  const numero = parseInt(somenteDigitos, 10) / 100;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataParaDDMMAAAA(iso) {
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()}`;
}

function ddmmaaaaParaIso(texto) {
  const [dia, mes, ano] = texto.split('/');
  return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)).toISOString();
}

function ddmmaaaaParaDate(texto) {
  const [dia, mes, ano] = texto.split('/');
  return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
}

const TITULOS = {
  entrada: 'Entradas do mês',
  saida: 'Gastos do mês',
  recorrente: 'Contas previstas',
};

export default function EditListScreen({ navigation, route }) {
  const { referencia } = useMes();
  const { cores } = useTema();
  const { modo, tipo, contaId, movimentacaoId } = route.params; // modo: 'movimentacao' | 'recorrente'
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [campoNome, setCampoNome] = useState('');
  const [campoValor, setCampoValor] = useState('');
  const [campoData, setCampoData] = useState('');
  const [campoParcelas, setCampoParcelas] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [campoCategoria, setCampoCategoria] = useState('');

  const tipoCategoria = modo === 'movimentacao' ? tipo : 'saida'; // contas recorrentes são sempre saída

  React.useEffect(() => {
    getCategorias().then((lista) => setCategorias(lista.filter((c) => c.tipo === tipoCategoria)));
  }, [tipoCategoria]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const lista =
      modo === 'movimentacao'
        ? await getMovimentacoesPorTipo(tipo, referencia)
        : await getContasRecorrentesEditaveis(referencia);
    const idFiltrado = contaId || movimentacaoId;
    const itensFiltrados = idFiltrado ? lista.filter((item) => item.id === idFiltrado) : lista;
    setItens(itensFiltrados);
    if (idFiltrado && itensFiltrados[0]) {
      iniciarEdicao(itensFiltrados[0]);
    }
    setCarregando(false);
  }, [modo, tipo, contaId, movimentacaoId, referencia]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  function iniciarEdicao(item) {
    setEditandoId(item.id);
    setCampoNome(item.nome);
    setCampoCategoria(modo === 'movimentacao' ? item.nome : (item.categoriaNome || ''));
    setCampoValor(item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setCampoData(modo === 'movimentacao' ? dataParaDDMMAAAA(item.data) : String(item.diaVencimento));
    setCampoParcelas(item.quantidadeParcelas ? String(item.quantidadeParcelas) : '');
  }

  async function salvarEdicao() {
    const valorNumerico = parseFloat(campoValor.replace(/\./g, '').replace(',', '.'));
    if (modo === 'movimentacao') {
      await atualizarMovimentacao(editandoId, {
        valor: valorNumerico,
        data: ddmmaaaaParaIso(campoData),
        categoriaNome: campoCategoria.trim() || campoNome.trim(),
        tipo,
      });
    } else {
      await atualizarContaRecorrente(editandoId, {
        nome: campoNome.trim(),
        valor: valorNumerico,
        diaVencimento: itens.find((item) => item.id === editandoId)?.tipo === 'parcela' ? 1 : parseInt(campoData, 10),
        quantidadeParcelas: itens.find((item) => item.id === editandoId)?.tipo === 'parcela' ? parseInt(campoParcelas, 10) || null : null,
        categoriaNome: campoCategoria.trim() || null,
      });
    }
    setEditandoId(null);
    if (contaId || movimentacaoId) navigation.goBack();
    else carregar();
  }

  async function confirmarExclusao(id) {
    if (modo === 'movimentacao') {
      await excluirMovimentacao(id);
    } else {
      await excluirContaRecorrente(id);
    }
    setConfirmandoId(null);
    if (contaId || movimentacaoId) navigation.goBack();
    else carregar();
  }

  // Marcar/desmarcar como paga — só existe para contas recorrentes
  // (Previsto), igual já funciona em Contas > Fixas e dentro dos cartões.
  async function marcarComoPaga(item) {
    await alternarContaPaga(item.id, referencia, item.estaPaga);
    carregar();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <KeyboardAvoidingView style={styles.conteudoTotal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={22} color={cores.texto} />
          </TouchableOpacity>
          <Text style={[styles.headerTitulo, { color: cores.texto }]}>{TITULOS[modo === 'movimentacao' ? tipo : 'recorrente']}</Text>
          <View style={{ width: 22 }} />
        </View>

        {carregando ? (
          <View style={styles.centro}>
            <ActivityIndicator size="large" color={cores.primario} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {itens.length === 0 && (
              <Text style={[styles.vazio, { color: cores.textoSecundario }]}>Nada por aqui ainda.</Text>
            )}

            {itens.map((item) => (
              <View key={item.id} style={[styles.item, { borderBottomColor: cores.borda }, modo === 'recorrente' && item.estaPaga && styles.itemPaga]}>
                {editandoId === item.id ? (
                  <View style={styles.itemEdicao}>
                    {modo === 'recorrente' && (
                      <>
                        <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario }]}>Nome</Text>
                        <TextInput style={[styles.input, { borderColor: cores.borda, color: cores.texto }]} value={campoNome} onChangeText={setCampoNome} />
                      </>
                    )}

                    <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario, marginTop: modo === 'recorrente' ? 10 : 0 }]}>Categoria</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriaLista}>
                      {categorias.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.categoriaChip,
                            { borderColor: cores.borda },
                            campoCategoria === c.nome && { backgroundColor: c.cor, borderColor: c.cor },
                          ]}
                          onPress={() => setCampoCategoria(c.nome)}
                        >
                          <Ionicons name={c.icone || 'pricetag-outline'} size={14} color={campoCategoria === c.nome ? '#fff' : (c.cor || cores.texto)} />
                          <Text style={[styles.categoriaChipTexto, { color: campoCategoria === c.nome ? '#fff' : cores.texto }]}>{c.nome}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario, marginTop: 10 }]}>Valor</Text>
                    <View style={[styles.linhaValor, { borderColor: cores.borda }]}>
                      <Text style={[styles.prefixoValor, { color: cores.textoSecundario }]}>R$</Text>
                      <TextInput
                        style={[styles.inputValor, { color: cores.texto }]}
                        keyboardType="number-pad"
                        value={campoValor}
                        onChangeText={(t) => setCampoValor(formatarValorInput(t))}
                      />
                    </View>

                    {!(modo === 'recorrente' && item.tipo === 'parcela') && <><Text style={[styles.rotuloPequeno, { color: cores.textoSecundario, marginTop: 10 }]}>{modo === 'movimentacao' ? 'Data' : 'Dia de vencimento'}</Text>{modo === 'movimentacao' ? <><CampoData valor={ddmmaaaaParaDate(campoData)} aoAlterar={(novaData) => setCampoData(dataParaDDMMAAAA(novaData.toISOString()))} cores={cores} estilo={styles.seletorData} /></> : <TextInput style={[styles.input, { borderColor: cores.borda, color: cores.texto }]} value={campoData} onChangeText={setCampoData} keyboardType="number-pad" placeholder="Ex: 10" />}</>}

                    {modo === 'recorrente' && item.tipo === 'parcela' && <>
                      <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario, marginTop: 10 }]}>Quantidade de parcelas</Text>
                      <TextInput
                        style={[styles.input, { borderColor: cores.borda, color: cores.texto }]}
                        value={campoParcelas}
                        onChangeText={setCampoParcelas}
                        keyboardType="number-pad"
                        placeholder="Ex: 12"
                        maxLength={2}
                      />
                    </>}

                    <View style={styles.edicaoBotoes}>
                      <TouchableOpacity style={[styles.botaoCancelar, { borderColor: cores.borda }]} onPress={() => (contaId || movimentacaoId) ? navigation.goBack() : setEditandoId(null)}>
                        <Text style={[styles.botaoCancelarTexto, { color: cores.texto }]}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.botaoSalvar, { backgroundColor: cores.primario }]} onPress={salvarEdicao}>
                        <Text style={styles.botaoSalvarTexto}>Salvar</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.botaoExcluir} onPress={() => {
                      setEditandoId(null);
                      setConfirmandoId(item.id);
                    }}>
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                      <Text style={styles.botaoExcluirTexto}>
                        {modo === 'recorrente' ? 'Excluir conta' : tipo === 'entrada' ? 'Excluir entrada' : 'Excluir gasto'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : confirmandoId === item.id ? (
                  <View style={styles.itemEdicao}>
                    <Text style={[styles.confirmTexto, { color: cores.texto }]}>Excluir "{item.nome}"?</Text>
                    <View style={styles.edicaoBotoes}>
                      <TouchableOpacity style={[styles.botaoCancelar, { borderColor: cores.borda }]} onPress={() => setConfirmandoId(null)}>
                        <Text style={[styles.botaoCancelarTexto, { color: cores.texto }]}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.botaoExcluirConfirm} onPress={() => confirmarExclusao(item.id)}>
                        <Text style={styles.botaoSalvarTexto}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.itemLinha}>
                    <TouchableOpacity
                      style={styles.itemLinhaConteudo}
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('EditarLancamentos', {
                          modo,
                          tipo,
                          ...(modo === 'recorrente' ? { contaId: item.id } : { movimentacaoId: item.id }),
                        })
                      }
                    >
                      <View>
                        <Text style={[styles.itemNome, { color: cores.texto }]}>{item.nome}</Text>
                        <Text style={[styles.itemSub, { color: cores.textoSecundario }]}>
                          {modo === 'movimentacao' ? dataParaDDMMAAAA(item.data) : `dia ${item.diaVencimento}`}
                        </Text>
                      </View>
                      <Text style={[styles.itemValor, { color: cores.texto }]}>{formatarReal(item.valor)}</Text>
                    </TouchableOpacity>
                    {modo === 'recorrente' && (
                      <TouchableOpacity
                        style={[styles.caixaPaga, { marginLeft: 10 }, item.estaPaga && styles.caixaPagaAtiva]}
                        onPress={() => marcarComoPaga(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        {item.estaPaga && <Ionicons name="checkmark" size={15} color="#fff" />}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}

            {modo === 'movimentacao' && tipo === 'entrada' && !contaId && !movimentacaoId && (
              <TouchableOpacity
                style={[styles.botaoNovo, { borderColor: cores.primario }]}
                onPress={() => navigation.navigate('AdicionarMovimentacao', { tipo: 'entrada' })}
              >
                <Ionicons name="add" size={16} color={cores.primario} />
                <Text style={[styles.botaoNovoTexto, { color: cores.primario }]}>Nova entrada</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  conteudoTotal: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  vazio: { fontSize: 13, textAlign: 'center', paddingVertical: 30 },
  item: { borderBottomWidth: 0.5, paddingVertical: 10 },
  itemPaga: { backgroundColor: '#EAFBEF', borderRadius: 10, paddingHorizontal: 8 },
  itemLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemLinhaConteudo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemNome: { fontSize: 14, fontWeight: '500' },
  itemSub: { fontSize: 12 },
  itemDireita: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 10 },
  itemValor: { fontSize: 14, fontWeight: '500' },
  botaoAcao: { padding: 2 },
  caixaPaga: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: '#C7C7CC', alignItems: 'center', justifyContent: 'center' },
  caixaPagaAtiva: { backgroundColor: '#16803C', borderColor: '#16803C' },
  itemEdicao: { paddingVertical: 6 },
  categoriaLista: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  categoriaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    height: 30,
  },
  categoriaChipTexto: { fontSize: 12 },
  rotuloPequeno: { fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 14,
  },
  seletorData: { height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dataTexto: { fontSize: 14 },
  linhaValor: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 40 },
  prefixoValor: { fontSize: 14 },
  inputValor: { flex: 1, fontSize: 14, padding: 0 },
  confirmTexto: { fontSize: 14, marginBottom: 4 },
  edicaoBotoes: { flexDirection: 'row', gap: 8, marginTop: 12 },
  botaoCancelar: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoCancelarTexto: { fontSize: 13 },
  botaoSalvar: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoExcluirConfirm: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSalvarTexto: { fontSize: 13, color: '#fff', fontWeight: '600' },
  botaoExcluir: { height: 40, borderRadius: 8, marginTop: 10, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  botaoExcluirTexto: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  botaoNovo: {
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  botaoNovoTexto: { fontSize: 14, fontWeight: '500' },
});