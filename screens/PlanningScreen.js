import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getProximosLancamentos, excluirContaRecorrente, alternarContaPaga } from '../database/queries';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';
import WebPageHeader from '../components/WebPageHeader';
import PageIntro from '../components/PageIntro';
import { navigationRef } from '../App';

function formatarReal(valor) {
  return Math.abs(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const CONFIG_STATUS = {
  vencidas: { titulo: 'Vencidas', icone: 'alert-circle-outline', cor: '#D96975' },
  pendentes: { titulo: 'Pendentes', icone: 'time-outline', cor: '#C58A32' },
  pagas: { titulo: 'Pagas', icone: 'checkmark-circle-outline', cor: '#3D9B72' },
};

function agruparPorStatus(lancamentos, ano, mes) {
  const hoje = new Date();
  const hojeInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const mesSelecionado = ano * 12 + mes;
  const mesAtual = hoje.getFullYear() * 12 + hoje.getMonth();

  const itens = lancamentos.map((item) => {
    const diaSolicitado = parseInt(item.dia, 10) || 1;
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    const vencimento = new Date(ano, mes, Math.min(diaSolicitado, ultimoDia));
    const vencida = !item.estaPaga && (
      mesSelecionado < mesAtual || (mesSelecionado === mesAtual && vencimento < hojeInicio)
    );
    return { ...item, status: item.estaPaga ? 'pagas' : vencida ? 'vencidas' : 'pendentes' };
  });

  return Object.keys(CONFIG_STATUS).map((chave) => ({
    chave,
    ...CONFIG_STATUS[chave],
    itens: itens.filter((item) => item.status === chave),
  }));
}

export default function PlanningScreen() {
  const { ano, mes, referencia } = useMes();
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web' && width >= 768;
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizacao, setAtualizacao] = useState(0);
  const [statusAtivo, setStatusAtivo] = useState('pendentes');

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      async function carregar() {
        setCarregando(true);
        const listaLancamentos = await getProximosLancamentos(referencia);
        if (ativo) {
          setLancamentos(listaLancamentos);
          setCarregando(false);
        }
      }
      carregar();
      return () => { ativo = false; };
    }, [ano, mes, atualizacao])
  );

  function editarConta(item) {
    navigationRef.navigate('EditarLancamentos', { modo: 'recorrente', contaId: item.id });
  }

  function apagarConta(item) {
    const apagar = async () => {
      await excluirContaRecorrente(item.id);
      setAtualizacao((valor) => valor + 1);
    };
    if (web && typeof window !== 'undefined') {
      if (window.confirm(`Apagar a conta "${item.nome}"?`)) apagar();
      return;
    }
    Alert.alert('Apagar conta', `Deseja apagar "${item.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: apagar },
    ]);
  }

  if (carregando) {
    return (
      <SafeAreaView style={[styles.container, styles.centro, { backgroundColor: cores.fundo }]}>
        <ActivityIndicator size="large" color={cores.primario} />
      </SafeAreaView>
    );
  }

  const grupos = agruparPorStatus(lancamentos, ano, mes);
  const grupoAtivo = grupos.find((grupo) => grupo.chave === statusAtivo) || grupos[0];

  async function alternarPagamento(item) {
    await alternarContaPaga(item.id, referencia, item.estaPaga);
    setAtualizacao((valor) => valor + 1);
  }

  if (web) {
    return (
      <PlanningWeb
        cores={cores}
        grupos={grupos}
        statusAtivo={statusAtivo}
        setStatusAtivo={setStatusAtivo}
        editarConta={editarConta}
        apagarConta={apagarConta}
        alternarPagamento={alternarPagamento}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PageIntro kicker="CONTAS DO MÊS" titulo="Planejamento" subtitulo="Acompanhe o que já foi pago, está pendente ou venceu." cores={cores} />
        <AbasStatus grupos={grupos} statusAtivo={statusAtivo} setStatusAtivo={setStatusAtivo} cores={cores} web={false} />
        <ListaContas grupo={grupoAtivo} cores={cores} web={false}
          editarConta={editarConta} apagarConta={apagarConta} alternarPagamento={alternarPagamento} />
      </ScrollView>
    </SafeAreaView>
  );
}

function AbasStatus({ grupos, statusAtivo, setStatusAtivo, cores, web }) {
  return (
    <View style={web ? webStyles.abasStatus : styles.abasStatus}>
      {grupos.map((grupo) => {
        const total = grupo.itens.reduce((soma, item) => soma + Math.abs(item.valor), 0);
        const ativo = grupo.chave === statusAtivo;
        return (
          <TouchableOpacity key={grupo.chave} onPress={() => setStatusAtivo(grupo.chave)} activeOpacity={0.8}
            accessibilityRole="button" accessibilityState={{ selected: ativo }}
            accessibilityLabel={`${grupo.titulo}, ${grupo.itens.length} contas, ${formatarReal(total)}`}
            style={[web ? webStyles.abaStatus : styles.abaStatus, { backgroundColor: cores.card, borderColor: ativo ? cores.primario : cores.borda }]}>
            <Text numberOfLines={1} style={[web ? webStyles.abaStatusTitulo : styles.abaStatusTitulo, { color: cores.textoSecundario }]}>{grupo.titulo}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[web ? webStyles.abaStatusTotal : styles.abaStatusTotal, { color: cores.texto }]}>{formatarReal(total)}</Text>
            <Text style={[web ? webStyles.abaStatusContagem : styles.abaStatusContagem, { color: grupo.cor }]}>{grupo.itens.length} {grupo.itens.length === 1 ? 'conta' : 'contas'}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ListaContas({ grupo, cores, web, editarConta, apagarConta, alternarPagamento }) {
  const total = grupo.itens.reduce((soma, item) => soma + Math.abs(item.valor), 0);
  return (
    <View style={[web ? webStyles.cardLista : styles.cardLista, { backgroundColor: cores.card, borderColor: cores.borda }]}>
      <View style={web ? webStyles.listaTopo : styles.listaTopo}>
        <View style={web ? webStyles.listaTituloGrupo : styles.listaTituloGrupo}>
          <View style={[web ? webStyles.statusIcone : styles.statusIcone, { backgroundColor: `${grupo.cor}1A` }]}>
            <Ionicons name={grupo.icone} size={web ? 16 : 15} color={grupo.cor} />
          </View>
          <Text style={[web ? webStyles.listaTitulo : styles.listaTitulo, { color: cores.texto }]}>{grupo.titulo}</Text>
          <Text style={[web ? webStyles.listaContagem : styles.listaContagem, { color: cores.textoSecundario }]}>{grupo.itens.length}</Text>
        </View>
        <Text style={[web ? webStyles.totalGrupo : styles.totalGrupo, { color: cores.texto }]}>{formatarReal(total)}</Text>
      </View>
      {grupo.itens.length === 0 ? (
        <Text style={[web ? webStyles.vazio : styles.vazio, { color: cores.textoSecundario }]}>
          {grupo.chave === 'vencidas' ? 'Nenhuma conta vencida.' : grupo.chave === 'pendentes' ? 'Nenhuma conta pendente.' : 'Nenhuma conta paga neste mês.'}
        </Text>
      ) : grupo.itens.map((item) => (
        <ContaStatusRow key={item.id} item={item} grupo={grupo} cores={cores} web={web}
          editarConta={editarConta} apagarConta={apagarConta} alternarPagamento={alternarPagamento} />
      ))}
    </View>
  );
}

function ContaStatusRow({ item, grupo, cores, web, editarConta, apagarConta, alternarPagamento }) {
  return (
    <View style={[web ? webStyles.item : styles.item, { borderBottomColor: cores.borda }]}>
      <View style={web ? webStyles.itemEsquerda : styles.itemEsquerda}>
        <View style={[web ? webStyles.itemDia : styles.itemDia, { backgroundColor: `${grupo.cor}1A` }]}>
          <Text style={[web ? webStyles.itemDiaTexto : styles.itemDiaTexto, { color: grupo.cor }]}>{item.dia}</Text>
        </View>
        <View style={web ? webStyles.itemDescricao : null}>
          <Text numberOfLines={1} style={[web ? webStyles.itemNome : styles.itemNome, { color: cores.texto }]}>{item.nome}</Text>
          <Text style={[web ? webStyles.itemTipo : styles.itemTipo, { color: cores.textoSecundario }]}>{item.tipo} · dia {item.dia}</Text>
        </View>
      </View>
      <View style={web ? webStyles.itemAcoes : styles.itemAcoes}>
        <Text style={[web ? webStyles.itemValor : styles.itemValor, { color: cores.texto }]}>{formatarReal(item.valor)}</Text>
        <TouchableOpacity onPress={() => alternarPagamento(item)} accessibilityLabel={item.estaPaga ? `Desmarcar ${item.nome} como paga` : `Marcar ${item.nome} como paga`}
          style={[web ? webStyles.botaoAcao : styles.botaoAcao, { backgroundColor: item.estaPaga ? `${grupo.cor}1A` : cores.fundo }]}>
          <Ionicons name={item.estaPaga ? 'checkmark-circle' : 'checkmark-circle-outline'} size={web ? 18 : 19} color={item.estaPaga ? grupo.cor : cores.textoSecundario} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => editarConta(item)} accessibilityLabel={`Editar ${item.nome}`} style={web ? webStyles.botaoAcao : styles.botaoAcao}>
          <Ionicons name="create-outline" size={17} color={cores.primario} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => apagarConta(item)} accessibilityLabel={`Apagar ${item.nome}`} style={web ? webStyles.botaoAcao : styles.botaoAcao}>
          <Ionicons name="trash-outline" size={17} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PlanningWeb({ cores, grupos, statusAtivo, setStatusAtivo, editarConta, apagarConta, alternarPagamento }) {
  return (
    <SafeAreaView style={[webStyles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={webStyles.scrollContent}>
        <WebPageHeader acaoTexto="Nova conta" aoAcionar={() => navigationRef.navigate('AdicionarContaRecorrente')} />
        <PageIntro
          kicker="CONTAS DO MÊS"
          titulo="Planejamento"
          subtitulo="Acompanhe o que já foi pago, está pendente ou venceu."
          cores={cores}
        />
        <AbasStatus grupos={grupos} statusAtivo={statusAtivo} setStatusAtivo={setStatusAtivo} cores={cores} web />
        <ListaContas grupo={grupos.find((item) => item.chave === statusAtivo) || grupos[0]} cores={cores} web
          editarConta={editarConta} apagarConta={apagarConta} alternarPagamento={alternarPagamento} />
      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48, maxWidth: 1240, width: '100%', alignSelf: 'center' },
  abasStatus: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  abaStatus: { flex: 1, minWidth: 0, minHeight: 96, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 16, justifyContent: 'center' },
  abaStatusTitulo: { fontSize: 12, marginBottom: 6 },
  abaStatusTotal: { fontSize: 23, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' },
  abaStatusContagem: { fontSize: 10, marginTop: 3 },
  cardLista: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 8 },
  listaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, paddingVertical: 5 },
  listaTituloGrupo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusIcone: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  listaTitulo: { fontSize: 15, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' },
  listaContagem: { fontSize: 11, minWidth: 22 },
  totalGrupo: { fontSize: 12, fontWeight: '600' },
  vazio: { fontSize: 12, paddingVertical: 10, paddingLeft: 34 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  itemEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  itemDescricao: { flex: 1, minWidth: 0 },
  itemDia: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemDiaTexto: { fontSize: 12, fontWeight: '700' },
  itemNome: { fontSize: 13, fontWeight: '600' },
  itemTipo: { fontSize: 11, marginTop: 2 },
  itemAcoes: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  itemValor: { fontSize: 12, fontWeight: '600', marginRight: 2 },
  botaoAcao: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  abasStatus: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  abaStatus: { flex: 1, minWidth: 0, minHeight: 82, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 11, justifyContent: 'center' },
  abaStatusTitulo: { fontSize: 10, marginBottom: 5 },
  abaStatusTotal: { fontSize: 16, fontWeight: '700' },
  abaStatusContagem: { fontSize: 9, marginTop: 3 },
  cardLista: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 5, marginTop: 8 },
  listaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, paddingVertical: 4 },
  listaTituloGrupo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusIcone: { width: 25, height: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  listaTitulo: { fontSize: 15, fontWeight: '700' },
  listaContagem: { fontSize: 11 },
  totalGrupo: { fontSize: 11, fontWeight: '600' },
  vazio: { fontSize: 12, paddingVertical: 9, paddingLeft: 32 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  itemEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  itemDia: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  itemDiaTexto: { fontSize: 12, fontWeight: '700' },
  itemNome: { fontSize: 13, fontWeight: '600', maxWidth: 150 },
  itemTipo: { fontSize: 11, marginTop: 2 },
  itemAcoes: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  itemValor: { fontSize: 12, fontWeight: '600', marginRight: 1 },
  botaoAcao: { width: 29, height: 29, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
