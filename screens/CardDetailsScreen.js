import React, { useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Pressable } from 'react-native';
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
const dataDoMes = (dia, referencia) => {
  if (!dia) return 'Não informado';
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const mes = referencia ? Number(referencia.split('-')[1]) - 1 : new Date().getMonth();
  return `${dia} de ${meses[mes]}`;
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
function statusDaFatura(diaFechamento, diaVencimento, ehMesAtual) {
  if (!diaFechamento) return null;
  const hoje = new Date();
  if (ehMesAtual && diaVencimento) {
    const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
    let diasAteVencimento = Math.ceil((vencimento.setHours(0, 0, 0, 0) - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()) / 86400000);
    if (diasAteVencimento < 0) {
      const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      diasAteVencimento += diasNoMes;
    }
    if (diasAteVencimento === 0) return { tipo: 'urgente', texto: 'Vencimento hoje' };
    if (diasAteVencimento <= 3) return { tipo: 'urgente', texto: `Vence em ${diasAteVencimento} ${diasAteVencimento === 1 ? 'dia' : 'dias'}` };
    if (diasAteVencimento <= 7) return { tipo: 'atencao', texto: `Vence em ${diasAteVencimento} dias` };
  }
  const diaHoje = hoje.getDate();
  return diaHoje > diaFechamento
    ? { tipo: 'fechada', texto: `Ciclo fechado · fechou dia ${diaFechamento}` }
    : { tipo: 'aberta', texto: `Ciclo aberto · fecha dia ${diaFechamento}` };
}

function dataDaCompra(data) {
  if (!data) return '';
  const partes = data.split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
}

export default function CardDetailsScreen({ route, navigation }) {
  const { referencia, label: mesLabel, mesAnterior, proximoMes, ehMesAtual } = useMes();
  const { cores, modoEscuro } = useTema();
  const web = Platform.OS === 'web';
  const { cartao } = route.params;
  const [dados, setDados] = useState(null);
  const [dadosProximos, setDadosProximos] = useState(null);
  const [aba, setAba] = useState('parcelas');
  const [diaVencimento, setDiaVencimento] = useState(cartao.dia_vencimento);
  const [diaFechamento, setDiaFechamento] = useState(cartao.dia_fechamento);
  const [campoData, setCampoData] = useState(null);
  const [limiteCartao, setLimiteCartao] = useState(Number(cartao.limite) || 0);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);
  const [mostrarOpcoesConta, setMostrarOpcoesConta] = useState(false);
  const labels = { parcelas: 'Crédito', debito: 'Débito', assinaturas: 'Assinaturas' };

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
  const faturaAtual = [...dados.parcelas, ...dados.assinaturas, ...(dados.credito || []), ...(dados.debito || [])].reduce((soma, item) => soma + item.valor, 0);
  const faturaProxima = dadosProximos ? [...dadosProximos.parcelas, ...dadosProximos.assinaturas, ...(dadosProximos.credito || []), ...(dadosProximos.debito || [])].reduce((soma, item) => soma + item.valor, 0) : 0;
  const limite = limiteCartao;
  const percentualLimite = limite ? Math.min((faturaAtual / limite) * 100, 100) : 0;
  const corProgresso = percentualLimite >= 85 ? '#E05252' : percentualLimite >= 65 ? '#D99A2B' : '#26836F';
  const status = statusDaFatura(diaFechamento, diaVencimento, ehMesAtual);
  const lista = aba === 'parcelas' ? [...dados.parcelas, ...(dados.credito || [])] : dados[aba];
  const totalLista = lista.reduce((soma, item) => soma + item.valor, 0);

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

  const statusCores = status?.tipo === 'urgente'
    ? (modoEscuro ? { fundo: '#4D282B', texto: '#FFB4B4' } : { fundo: '#FEE2E2', texto: '#B91C1C' })
    : status?.tipo === 'atencao'
      ? (modoEscuro ? { fundo: '#49391F', texto: '#F5D28B' } : { fundo: '#FEF3C7', texto: '#92400E' })
      : { fundo: cores.fundoIcone, texto: cores.primario };

  function abrirEdicaoCartao() {
    navigation.navigate('EditarCartao', { cartao: { ...cartao, limite, dia_vencimento: diaVencimento, dia_fechamento: diaFechamento } });
  }

  function abrirNovaConta(tipoInicial) {
    setMostrarOpcoesConta(false);
    navigation.navigate('AdicionarContaRecorrente', {
      cartaoId: cartao.id,
      tipoInicial,
      mesInicio: `${referencia}-01`,
    });
  }

  function abrirNovoDebito() {
    setMostrarOpcoesConta(false);
    navigation.navigate('AdicionarMovimentacao', { tipo: 'saida', formaInicial: 'debito', cartaoId: cartao.id });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <View style={web ? styles.webShell : styles.mobileShell}>
        <View style={[styles.header, web && styles.webHeader]}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={22} color={cores.texto} />
          </TouchableOpacity>
          <Text style={[styles.titulo, { color: cores.texto }]}>{cartao.apelido}</Text>
          <TouchableOpacity onPress={() => setConfirmandoExcluir(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Excluir cartão">
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[styles.scroll, web && styles.webScroll]}>
          {web && (
            <View style={[styles.seletorMes, { backgroundColor: cores.card, borderColor: cores.borda }]}>
              <TouchableOpacity onPress={mesAnterior} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Mês anterior">
                <Ionicons name="chevron-back" size={16} color={cores.textoSecundario} />
              </TouchableOpacity>
              <Text style={[styles.seletorMesTexto, { color: cores.texto }]}>{mesLabel}</Text>
              <TouchableOpacity onPress={proximoMes} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Próximo mês">
                <Ionicons name="chevron-forward" size={16} color={cores.textoSecundario} />
              </TouchableOpacity>
            </View>
          )}

          {confirmandoExcluir && (
            <View style={[styles.card, { backgroundColor: cores.card }]}>
              <Text style={[styles.confirmTexto, { color: cores.texto }]}>Excluir o cartão "{cartao.apelido}"? As parcelas, assinaturas e gastos já lançados continuam salvos, só deixam de estar vinculados a este cartão.</Text>
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
            <View style={styles.resumoTopo}>
              <View style={styles.identidadeCartao}>
                <View style={[styles.iconeCartao, { backgroundColor: cores.fundoIcone }]}>
                  <Ionicons name="card-outline" size={19} color={cores.primario} />
                </View>
                <View>
                  <Text style={[styles.resumoTitulo, { color: cores.textoSecundario }]}>Cartão</Text>
                  <Text style={[styles.resumoNome, { color: cores.texto }]}>{cartao.apelido}{cartao.ultimos_digitos ? `  •••• ${cartao.ultimos_digitos}` : ''}</Text>
                </View>
              </View>
              {!!status && (
                <View style={[styles.statusBadge, { backgroundColor: statusCores.fundo }]}>
                  <View style={[styles.statusPonto, { backgroundColor: statusCores.texto }]} />
                  <Text style={[styles.statusBadgeTexto, { color: statusCores.texto }]}>{status.texto}</Text>
                </View>
              )}
            </View>

            <View style={styles.metricas}>
              {[
                { titulo: 'Limite total', valor: real(limite), icone: 'card-outline' },
                { titulo: 'Fatura atual', valor: real(faturaAtual), icone: 'receipt-outline' },
                { titulo: 'Disponível', valor: real(Math.max(limite - faturaAtual, 0)), icone: 'wallet-outline' },
              ].map((metrica) => (
                <View key={metrica.titulo} style={[styles.metrica, { backgroundColor: cores.fundo }]}>
                  <View style={styles.metricaTopo}>
                    <Ionicons name={metrica.icone} size={14} color={cores.primario} />
                    <Text style={[styles.metricaTitulo, { color: cores.textoSecundario }]}>{metrica.titulo}</Text>
                  </View>
                  <Text style={[styles.metricaValor, { color: cores.texto }]}>{metrica.valor}</Text>
                </View>
              ))}
            </View>

            <View style={styles.progressoBox}>
              <View style={styles.progressoTopo}>
                <Text style={[styles.limiteLabel, { color: cores.texto }]}>Uso do limite</Text>
                <Text style={[styles.progressoPercentual, { color: corProgresso }]}>{limite ? `${Math.round((faturaAtual / limite) * 100)}% usado` : 'Defina o limite'}</Text>
              </View>
              <View style={[styles.trilho, { backgroundColor: cores.borda }]}>
                <View style={[styles.progresso, { width: `${percentualLimite}%`, backgroundColor: corProgresso }]} />
              </View>
              {limite > 0 && faturaAtual > limite && (
                <Text style={[styles.alertaLimite, { color: modoEscuro ? '#FFB4B4' : '#B91C1C' }]}>O total da fatura ultrapassou o limite cadastrado.</Text>
              )}
            </View>

            <View style={[styles.datasBox, { backgroundColor: cores.fundo }]}>
              <TouchableOpacity style={styles.dataInfo} onPress={() => setCampoData('vencimento')}>
                <View style={styles.dataTitulo}><Ionicons name="calendar-outline" size={13} color={cores.textoSecundario} /><Text style={[styles.dataLabel, { color: cores.textoSecundario }]}>Vencimento</Text></View>
                <Text style={[styles.dataValor, { color: cores.texto }]}>{dataDoMes(diaVencimento, referencia)}</Text>
              </TouchableOpacity>
              <View style={[styles.divisor, { backgroundColor: cores.borda }]} />
              <TouchableOpacity style={styles.dataInfo} onPress={() => setCampoData('fechamento')}>
                <View style={styles.dataTitulo}><Ionicons name="calendar-outline" size={13} color={cores.textoSecundario} /><Text style={[styles.dataLabel, { color: cores.textoSecundario }]}>Fechamento</Text></View>
                <Text style={[styles.dataValor, { color: cores.texto }]}>{dataDoMes(diaFechamento, referencia)}</Text>
              </TouchableOpacity>
            </View>

            {campoData && (Platform.OS === 'web' ? (
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
            ))}

            {dadosProximos && (
              <View style={[styles.proximaFaturaBox, { borderTopColor: cores.borda }]}>
                <Text style={[styles.dataLabel, { color: cores.textoSecundario }]}>Prévia do próximo mês</Text>
                <Text style={[styles.proximaFaturaValor, { color: cores.texto }]}>{real(faturaProxima)}</Text>
              </View>
            )}

            <View style={styles.acoesCartao}>
              <TouchableOpacity style={[styles.botaoEditarCartao, { borderColor: cores.borda }]} onPress={abrirEdicaoCartao}>
                <Ionicons name="pencil-outline" size={15} color={cores.primario} />
                <Text style={[styles.botaoEditarTexto, { color: cores.primario }]}>Editar cartão</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botaoNovaConta, { backgroundColor: cores.primario }]} onPress={() => setMostrarOpcoesConta(true)}>
                <Ionicons name="add" size={17} color="#fff" />
                <Text style={styles.botaoNovaContaTexto}>Nova conta</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.secaoLancamentosTopo}>
            <View>
              <Text style={[styles.secaoTitulo, { color: cores.texto }]}>Lançamentos</Text>
              <Text style={[styles.secaoSubtitulo, { color: cores.textoSecundario }]}>Movimentos vinculados a este cartão</Text>
            </View>
          </View>

          <View style={styles.abas}>
            {Object.entries(labels).map(([chave, label]) => (
              <TouchableOpacity key={chave} onPress={() => setAba(chave)} style={[styles.aba, { backgroundColor: cores.card }, aba === chave && { backgroundColor: cores.primario }]}>
                <Text style={[styles.abaTexto, { color: cores.texto }, aba === chave && styles.abaTextoAtiva]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.grupoMesTopo}>
            <Text style={[styles.grupoMesTitulo, { color: cores.texto }]}>{mesLabel}</Text>
            <Text style={[styles.grupoMesTotal, { color: cores.textoSecundario }]}>{lista.length} {lista.length === 1 ? 'lançamento' : 'lançamentos'} · {real(totalLista)}</Text>
          </View>

          {lista.length === 0 ? (
            <View style={[styles.vazioLancamentos, { backgroundColor: cores.card }]}>
              <Ionicons name="receipt-outline" size={20} color={cores.textoSecundario} />
              <Text style={[styles.vazio, { color: cores.textoSecundario }]}>Nenhum lançamento nesta categoria no mês.</Text>
            </View>
          ) : lista.map((item) => {
            const subtitulo = item.origem === 'movimentacao'
              ? `Compra em ${dataDaCompra(item.data)}`
              : aba === 'assinaturas'
                ? ''
                : item.quantidadeParcelas
                ? `${String(item.parcelaAtual || 1).padStart(2, '0')}/${String(item.quantidadeParcelas).padStart(2, '0')}`
                : `vence dia ${item.diaVencimento}`;
            return (
              <View key={item.id} style={[styles.item, { backgroundColor: cores.card }, item.estaPaga && { backgroundColor: cores.fundoIcone }]}>
                <TouchableOpacity style={styles.itemConteudo} activeOpacity={0.7} onPress={() => item.origem === 'movimentacao'
                  ? navigation.navigate('EditarLancamentos', { modo: 'movimentacao', tipo: 'saida', movimentacaoId: item.id })
                  : navigation.navigate('EditarLancamentos', { modo: 'recorrente', contaId: item.id })}>
                  <View style={styles.itemTexto}>
                    <Text style={[styles.nome, { color: cores.texto }]}>{item.nome}</Text>
                    <Text style={[styles.sub, { color: cores.textoSecundario }]}>{subtitulo}</Text>
                  </View>
                  <Text style={[styles.valor, { color: cores.texto }]}>{real(item.valor)}</Text>
                </TouchableOpacity>
                {item.origem !== 'movimentacao' && (
                  <TouchableOpacity style={[styles.caixaPaga, item.estaPaga && styles.caixaPagaAtiva]} onPress={() => marcarComoPaga(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel={item.estaPaga ? 'Marcar como não paga' : 'Marcar como paga'}>
                    {item.estaPaga && <Ionicons name="checkmark" size={15} color="#fff" />}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
      <Modal visible={mostrarOpcoesConta} transparent animationType="fade" onRequestClose={() => setMostrarOpcoesConta(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMostrarOpcoesConta(false)}>
          <Pressable style={[styles.modalNovaConta, { backgroundColor: cores.card }]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalNovaContaTopo}>
              <View>
                <Text style={[styles.modalTitulo, { color: cores.texto }]}>O que deseja adicionar?</Text>
                <Text style={[styles.modalSubtitulo, { color: cores.textoSecundario }]}>Escolha o tipo de lançamento do cartão.</Text>
              </View>
              <TouchableOpacity onPress={() => setMostrarOpcoesConta(false)} accessibilityLabel="Fechar opções">
                <Ionicons name="close" size={20} color={cores.textoSecundario} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.opcaoNovaConta, { borderColor: cores.borda }]} onPress={() => abrirNovaConta('parcela')}>
              <View style={[styles.opcaoNovaContaIcone, { backgroundColor: cores.fundoIcone }]}><Ionicons name="card-outline" size={18} color={cores.primario} /></View>
              <View style={styles.opcaoNovaContaTextoBox}>
                <Text style={[styles.opcaoNovaContaTitulo, { color: cores.texto }]}>Adicionar crédito</Text>
                <Text style={[styles.opcaoNovaContaDescricao, { color: cores.textoSecundario }]}>Compra parcelada no cartão</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={cores.textoSecundario} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.opcaoNovaConta, { borderColor: cores.borda }]} onPress={() => abrirNovaConta('assinatura')}>
              <View style={[styles.opcaoNovaContaIcone, { backgroundColor: cores.fundoIcone }]}><Ionicons name="refresh-outline" size={18} color={cores.primario} /></View>
              <View style={styles.opcaoNovaContaTextoBox}>
                <Text style={[styles.opcaoNovaContaTitulo, { color: cores.texto }]}>Adicionar assinatura</Text>
                <Text style={[styles.opcaoNovaContaDescricao, { color: cores.textoSecundario }]}>Cobrança recorrente mensal</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={cores.textoSecundario} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.opcaoNovaConta, { borderColor: cores.borda, marginBottom: 0 }]} onPress={abrirNovoDebito}>
              <View style={[styles.opcaoNovaContaIcone, { backgroundColor: cores.fundoIcone }]}><Ionicons name="wallet-outline" size={18} color={cores.primario} /></View>
              <View style={styles.opcaoNovaContaTextoBox}>
                <Text style={[styles.opcaoNovaContaTitulo, { color: cores.texto }]}>Adicionar débito</Text>
                <Text style={[styles.opcaoNovaContaDescricao, { color: cores.textoSecundario }]}>Lançar uma compra neste cartão</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={cores.textoSecundario} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mobileShell: { flex: 1 },
  webShell: { flex: 1, width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 28, paddingTop: 20, paddingBottom: 24 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  webHeader: { padding: 0, marginBottom: 16, minHeight: 36 },
  titulo: { fontSize: 16, fontWeight: '600' },
  scroll: { padding: 16, paddingTop: 0 },
  webScroll: { paddingHorizontal: 0, paddingBottom: 24 },
  card: { borderRadius: 14, padding: 16, marginBottom: 18 },
  confirmTexto: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  confirmBotoes: { flexDirection: 'row', gap: 8 },
  botaoCancelar: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  botaoCancelarTexto: { fontSize: 14 },
  botaoExcluirConfirm: { flex: 1, height: 44, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  botaoTextoBranco: { fontSize: 14, color: '#fff', fontWeight: '600' },
  resumoCartao: { borderRadius: 16, padding: 20, marginBottom: 20 },
  resumoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  identidadeCartao: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  iconeCartao: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resumoTitulo: { fontSize: 11, fontWeight: '600' },
  resumoNome: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '62%' },
  statusPonto: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeTexto: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  metricas: { flexDirection: 'row', gap: 10, marginTop: 18 },
  metrica: { flex: 1, minWidth: 0, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12 },
  metricaTopo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricaTitulo: { fontSize: 11, fontWeight: '500' },
  metricaValor: { fontSize: 17, fontWeight: '700', marginTop: 9 },
  progressoBox: { marginTop: 16 },
  progressoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  limiteLabel: { fontSize: 12, fontWeight: '600' },
  progressoPercentual: { fontSize: 11, fontWeight: '700' },
  trilho: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progresso: { height: '100%', borderRadius: 4 },
  alertaLimite: { fontSize: 11, marginTop: 7 },
  datasBox: { flexDirection: 'row', borderRadius: 12, marginTop: 16, padding: 13 },
  dataInfo: { flex: 1 },
  dataTitulo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dataLabel: { fontSize: 11 },
  dataValor: { fontSize: 14, fontWeight: '600', marginTop: 5 },
  divisor: { width: 1, marginHorizontal: 12 },
  datePickerWeb: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 },
  proximaFaturaBox: { borderTopWidth: 0.5, marginTop: 13, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proximaFaturaValor: { fontSize: 14, fontWeight: '700' },
  acoesCartao: { flexDirection: 'row', gap: 9, marginTop: 16 },
  botaoEditarCartao: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  botaoEditarTexto: { fontSize: 12, fontWeight: '600' },
  botaoNovaConta: { flex: 1, height: 42, borderRadius: 10, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  botaoNovaContaTexto: { color: '#fff', fontSize: 12, fontWeight: '600' },
  secaoLancamentosTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  secaoTitulo: { fontSize: 18, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' },
  secaoSubtitulo: { fontSize: 12, marginTop: 3 },
  abas: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  aba: { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  abaTexto: { fontSize: 12, fontWeight: '600' },
  abaTextoAtiva: { color: '#fff' },
  grupoMesTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  grupoMesTitulo: { fontSize: 13, fontWeight: '700' },
  grupoMesTotal: { fontSize: 11 },
  item: { borderRadius: 11, padding: 13, marginBottom: 7, flexDirection: 'row', alignItems: 'center' },
  itemConteudo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  itemTexto: { flex: 1, minWidth: 0 },
  nome: { fontSize: 13, fontWeight: '600' },
  sub: { fontSize: 11, marginTop: 3 },
  valor: { fontSize: 13, fontWeight: '700' },
  caixaPaga: { width: 23, height: 23, borderRadius: 7, borderWidth: 1.5, borderColor: '#C7C7CC', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  caixaPagaAtiva: { backgroundColor: '#16803C', borderColor: '#16803C' },
  vazioLancamentos: { minHeight: 72, borderRadius: 12, padding: 16, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  vazio: { fontSize: 12, textAlign: 'center' },
  seletorMes: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 12, height: 34, paddingHorizontal: 11, borderWidth: 1, borderRadius: 999, marginBottom: 12 },
  seletorMesTexto: { fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalNovaConta: { width: '100%', maxWidth: 460, borderRadius: 18, padding: 22 },
  modalNovaContaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 },
  modalTitulo: { fontSize: 17, fontWeight: '700' },
  modalSubtitulo: { fontSize: 12, marginTop: 4 },
  opcaoNovaConta: { minHeight: 68, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 9 },
  opcaoNovaContaIcone: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  opcaoNovaContaTextoBox: { flex: 1 },
  opcaoNovaContaTitulo: { fontSize: 13, fontWeight: '600' },
  opcaoNovaContaDescricao: { fontSize: 11, marginTop: 3 },
});
