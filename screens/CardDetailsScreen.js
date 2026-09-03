import React, { useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDadosCartao, getCartoes, alternarContaPaga, atualizarDadosCartao, excluirCartao } from '../database/queries';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';

let DateTimePickerNativo = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line global-require
  DateTimePickerNativo = require('@react-native-community/datetimepicker').default;
}

const real = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataDoMes = (dia) => {
  if (!dia) return 'Não informado';
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${dia} de ${meses[new Date().getMonth()]}`;
};

function proximaReferencia(referencia) {
  const [ano, mes] = referencia.split('-').map(Number);
  const novoMes = mes === 12 ? 1 : mes + 1;
  const novoAno = mes === 12 ? ano + 1 : ano;
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`;
}

// Compara hoje com o dia de fechamento do cartão pra saber se a fatura
// deste mês já fechou (aguardando pagamento) ou ainda está acumulando
// compras (abre até o próximo fechamento).
function statusDaFatura(diaFechamento) {
  if (!diaFechamento) return null;
  const hoje = new Date().getDate();
  return hoje > diaFechamento
    ? { fechada: true, texto: `Fatura fechada · fechou dia ${diaFechamento}` }
    : { fechada: false, texto: `Fatura aberta · fecha dia ${diaFechamento}` };
}

export default function CardDetailsScreen({ route, navigation }) {
  const { referencia } = useMes();
  const { cores } = useTema();
  const { cartao } = route.params;
  const [dados, setDados] = useState(null);
  const [dadosProximos, setDadosProximos] = useState(null);
  const [aba, setAba] = useState('parcelas');
  const [diaVencimento, setDiaVencimento] = useState(cartao.dia_vencimento);
  const [diaFechamento, setDiaFechamento] = useState(cartao.dia_fechamento);
  const [campoData, setCampoData] = useState(null);
  const [limiteCartao, setLimiteCartao] = useState(Number(cartao.limite) || 0);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);
  const labels = { parcelas: 'Crédito', assinaturas: 'Assinaturas' };

  useFocusEffect(useCallback(() => {
    let ativo = true;
    Promise.all([
      getDadosCartao(cartao.id, referencia),
      getDadosCartao(cartao.id, proximaReferencia(referencia)),
      getCartoes(),
    ]).then(([resultado, resultadoProximo, cartoes]) => {
      if (!ativo) return;
      setDados(resultado);
      setDadosProximos(resultadoProximo);
      const atualizado = cartoes.find((item) => item.id === cartao.id);
      if (atualizado) setLimiteCartao(Number(atualizado.limite) || 0);
    });
    return () => { ativo = false; };
  }, [cartao.id, referencia]));

  if (!dados) return <SafeAreaView style={[styles.centro, { backgroundColor: cores.fundo }]}><ActivityIndicator size="large" color={cores.primario} /></SafeAreaView>;
  const lista = dados[aba];
  const faturaAtual = [...dados.parcelas, ...dados.assinaturas].reduce((soma, item) => soma + item.valor, 0);
  const faturaProxima = dadosProximos ? [...dadosProximos.parcelas, ...dadosProximos.assinaturas].reduce((soma, item) => soma + item.valor, 0) : 0;
  const limite = limiteCartao;
  const percentualLimite = limite ? Math.min((faturaAtual / limite) * 100, 100) : 0;
  const status = statusDaFatura(diaFechamento);

  async function marcarComoPaga(item) {
    await alternarContaPaga(item.id, referencia, item.estaPaga);
    setDados(await getDadosCartao(cartao.id, referencia));
  }

  async function confirmarExclusaoCartao() {
    await excluirCartao(cartao.id);
    navigation.goBack();
  }

  async function salvarDia(selecionada) {
    if (!selecionada || !campoData) { setCampoData(null); return; }
    const dia = selecionada.getDate();
    const proximoVencimento = campoData === 'vencimento' ? dia : diaVencimento;
    const proximoFechamento = campoData === 'fechamento' ? dia : diaFechamento;
    if (campoData === 'vencimento') setDiaVencimento(dia); else setDiaFechamento(dia);
    setCampoData(null);
    await atualizarDadosCartao(cartao.id, { limite: limiteCartao, diaVencimento: proximoVencimento, diaFechamento: proximoFechamento });
  }

  return <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
    <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={cores.texto} /></TouchableOpacity><Text style={[styles.titulo, { color: cores.texto }]}>{cartao.apelido}</Text><TouchableOpacity onPress={() => setConfirmandoExcluir(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}><Ionicons name="trash-outline" size={20} color="#DC2626" /></TouchableOpacity></View>
    <ScrollView contentContainerStyle={styles.scroll}>
      {confirmandoExcluir && (
        <View style={[styles.card, { backgroundColor: cores.card }]}>
          <Text style={[styles.confirmTexto, { color: cores.texto }]}>
            Excluir o cartão "{cartao.apelido}"? As parcelas, assinaturas e gastos já lançados continuam salvos, só deixam de estar vinculados a este cartão.
          </Text>
          <View style={styles.confirmBotoes}>
            <TouchableOpacity style={[styles.botaoCancelar, { borderColor: cores.borda }]} onPress={() => setConfirmandoExcluir(false)}>
              <Text style={[styles.botaoCancelarTexto, { color: cores.texto }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaoExcluirConfirm} onPress={confirmarExclusaoCartao}>
              <Text style={styles.botaoTextoBranco}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={[styles.resumoCartao, { backgroundColor: cores.card }]}>
        <View style={styles.resumoTopo}><View><Text style={[styles.resumoTitulo, { color: cores.textoSecundario }]}>Cartão</Text><Text style={[styles.resumoNome, { color: cores.texto }]}>{cartao.apelido} {cartao.ultimos_digitos ? `•••• ${cartao.ultimos_digitos}` : ''}</Text></View><Ionicons name="card-outline" size={23} color={cores.textoSecundario} /></View>
        <View style={styles.faturaLabelLinha}>
          <Text style={[styles.faturaLabel, { color: cores.textoSecundario }]}>Fatura atual</Text>
          {!!status && (
            <View style={[styles.statusBadge, { backgroundColor: status.fechada ? '#FEE2E2' : '#EAFBEF' }]}>
              <Text style={[styles.statusBadgeTexto, { color: status.fechada ? '#B91C1C' : '#16803C' }]}>{status.texto}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.faturaValor, { color: cores.texto }]}>{real(faturaAtual)}</Text>
        <TouchableOpacity style={[styles.limiteBox, { backgroundColor: cores.fundo }]} onPress={() => navigation.navigate('EditarCartao', { cartao: { ...cartao, limite, dia_vencimento: diaVencimento, dia_fechamento: diaFechamento } })}><View style={styles.limiteLinha}><Text style={[styles.limiteLabel, { color: cores.texto }]}>Limite utilizado</Text><Text style={[styles.limiteTexto, { color: cores.texto }]}>{real(faturaAtual)} de {real(limite)}</Text></View><View style={styles.trilho}><View style={[styles.progresso, { width: `${percentualLimite}%`, backgroundColor: cores.primario }]} /></View><View style={styles.limiteDisponivel}><Text style={styles.disponivelLabel}>Limite disponível</Text><Text style={styles.disponivelValor}>{real(Math.max(limite - faturaAtual, 0))}</Text><Ionicons name="chevron-forward" size={16} color={cores.primario} /></View></TouchableOpacity>
        <View style={[styles.datasBox, { backgroundColor: cores.fundo }]}><TouchableOpacity style={styles.dataInfo} onPress={() => setCampoData('vencimento')}><View style={styles.dataTitulo}><Ionicons name="calendar-outline" size={13} color={cores.textoSecundario} /><Text style={[styles.dataLabel, { color: cores.textoSecundario }]}>vencimento</Text></View><Text style={[styles.dataValor, { color: cores.texto }]}>{dataDoMes(diaVencimento)}</Text></TouchableOpacity><View style={[styles.divisor, { backgroundColor: cores.borda }]} /><TouchableOpacity style={styles.dataInfo} onPress={() => setCampoData('fechamento')}><View style={styles.dataTitulo}><Ionicons name="calendar-outline" size={13} color={cores.textoSecundario} /><Text style={[styles.dataLabel, { color: cores.textoSecundario }]}>fecha em</Text></View><Text style={[styles.dataValor, { color: cores.texto }]}>{dataDoMes(diaFechamento)}</Text></TouchableOpacity></View>
        {campoData && (
          Platform.OS === 'web' ? (
            <View style={[styles.datePickerWeb, { borderColor: cores.borda, backgroundColor: cores.fundo }]}>
              <input
                type="date"
                autoFocus
                defaultValue={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(campoData === 'vencimento' ? diaVencimento || 1 : diaFechamento || 1).padStart(2, '0')}`}
                onChange={(e) => {
                  if (!e.target.value) { setCampoData(null); return; }
                  const [ano, mes, dia] = e.target.value.split('-').map(Number);
                  salvarDia(new Date(ano, mes - 1, dia));
                }}
                onBlur={() => setCampoData(null)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontFamily: 'inherit', color: cores.texto, width: '100%' }}
              />
            </View>
          ) : (
            <DateTimePickerNativo value={new Date(new Date().getFullYear(), new Date().getMonth(), campoData === 'vencimento' ? diaVencimento || 1 : diaFechamento || 1)} mode="date" locale="pt-BR" display="inline" onChange={(_, selecionada) => salvarDia(selecionada)} />
          )
        )}
        {dadosProximos && (
          <View style={[styles.proximaFaturaBox, { borderTopColor: cores.borda }]}>
            <Text style={[styles.dataLabel, { color: cores.textoSecundario }]}>próxima fatura (prévia)</Text>
            <Text style={[styles.proximaFaturaValor, { color: cores.texto }]}>{real(faturaProxima)}</Text>
          </View>
        )}
      </View>
      <View style={styles.abas}>{Object.entries(labels).map(([chave, label]) => <TouchableOpacity key={chave} onPress={() => setAba(chave)} style={[styles.aba, { backgroundColor: cores.card }, aba === chave && { backgroundColor: cores.primario }]}><Text style={[styles.abaTexto, { color: cores.texto }, aba === chave && styles.abaTextoAtiva]}>{label}</Text></TouchableOpacity>)}</View>
      {lista.length === 0 ? <Text style={[styles.vazio, { color: cores.textoSecundario }]}>Nenhum lançamento neste cartão.</Text> : lista.map((item) => {
        // Assinaturas não mostram mais o "vence dia X" (removido a pedido) —
        // só parcelas continuam mostrando o progresso ou a data de vencimento.
        const subtitulo = aba === 'assinaturas'
          ? ''
          : (item.quantidadeParcelas ? `${String(item.parcelaAtual || 1).padStart(2, '0')}/${String(item.quantidadeParcelas).padStart(2, '0')}` : `vence dia ${item.diaVencimento}`);
        return <View key={item.id} style={[styles.item, { backgroundColor: cores.card }, item.estaPaga && { backgroundColor: '#EAFBEF' }]}><TouchableOpacity style={styles.itemConteudo} activeOpacity={0.7} onPress={() => navigation.navigate('EditarLancamentos', { modo: 'recorrente', contaId: item.id })}><View><Text style={[styles.nome, { color: cores.texto }]}>{item.nome}</Text>{!!subtitulo && <Text style={[styles.sub, { color: cores.textoSecundario }]}>{subtitulo}</Text>}</View><Text style={[styles.valor, { color: cores.texto }]}>{real(item.valor)}</Text></TouchableOpacity><TouchableOpacity style={[styles.caixaPaga, item.estaPaga && styles.caixaPagaAtiva]} onPress={() => marcarComoPaga(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>{item.estaPaga && <Ionicons name="checkmark" size={15} color="#fff" />}</TouchableOpacity></View>;
      })}
      <TouchableOpacity style={[styles.botaoNovo, { borderColor: cores.primario }]} onPress={() => navigation.navigate('AdicionarContaRecorrente', { cartaoId: cartao.id, tipoInicial: aba === 'assinaturas' ? 'assinatura' : 'parcela' })}><Ionicons name="add" size={17} color={cores.primario} /><Text style={[styles.botaoNovoTexto, { color: cores.primario }]}>Nova conta</Text></TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, centro: { flex: 1, alignItems: 'center', justifyContent: 'center' }, header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, titulo: { fontSize: 16, fontWeight: '600' }, scroll: { padding: 16, paddingTop: 0 }, card: { borderRadius: 14, padding: 16, marginBottom: 18 }, confirmTexto: { fontSize: 14, lineHeight: 20, marginBottom: 14 }, confirmBotoes: { flexDirection: 'row', gap: 8 }, botaoCancelar: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, botaoCancelarTexto: { fontSize: 14 }, botaoExcluirConfirm: { flex: 1, height: 44, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' }, botaoTextoBranco: { fontSize: 14, color: '#fff', fontWeight: '600' }, resumoCartao: { borderRadius: 14, padding: 18, marginBottom: 18 }, resumoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, resumoTitulo: { fontSize: 13, fontWeight: '600' }, resumoNome: { fontSize: 16, fontWeight: '700', marginTop: 3 }, faturaLabelLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }, faturaLabel: { fontSize: 13 }, statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }, statusBadgeTexto: { fontSize: 10, fontWeight: '600' }, faturaValor: { fontSize: 26, fontWeight: '700', marginTop: 3 }, limiteBox: { borderRadius: 13, padding: 14, marginTop: 20 }, limiteLinha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 }, limiteLabel: { fontSize: 13 }, limiteTexto: { fontSize: 13, fontWeight: '600' }, trilho: { height: 8, borderRadius: 4, backgroundColor: '#D1D1D6', overflow: 'hidden' }, progresso: { height: '100%', borderRadius: 4 }, datasBox: { flexDirection: 'row', borderRadius: 13, marginTop: 10, padding: 14 }, dataInfo: { flex: 1 }, dataTitulo: { flexDirection: 'row', alignItems: 'center', gap: 4 }, dataLabel: { fontSize: 12 }, dataValor: { fontSize: 15, fontWeight: '600', marginTop: 5 }, divisor: { width: 1, marginHorizontal: 12 }, proximaFaturaBox: { borderTopWidth: 0.5, marginTop: 14, paddingTop: 12 }, proximaFaturaValor: { fontSize: 17, fontWeight: '600', marginTop: 4 }, abas: { flexDirection: 'row', gap: 6, marginBottom: 10 }, aba: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, abaTexto: { fontSize: 12 }, abaTextoAtiva: { color: '#fff' }, item: { padding: 14, marginBottom: 1, flexDirection: 'row', alignItems: 'center' }, itemConteudo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, nome: { fontSize: 14, fontWeight: '500' }, sub: { fontSize: 12, marginTop: 3 }, valor: { fontSize: 14, fontWeight: '600' }, caixaPaga: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: '#C7C7CC', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }, caixaPagaAtiva: { backgroundColor: '#16803C', borderColor: '#16803C' }, vazio: { textAlign: 'center', padding: 24 }, botaoNovo: { height: 44, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, marginTop: 14, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }, botaoNovoTexto: { fontSize: 14, fontWeight: '600' }, disponivelLabel: { fontSize: 12, color: '#0F766E' }, disponivelValor: { fontSize: 12, color: '#0F766E', fontWeight: '600' }, limiteDisponivel: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 8 }, datePickerWeb: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 } });