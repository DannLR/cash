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
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { calcularResumoMensal, getMetas, resetarOnboarding } from '../database/queries';
import { navigationRef } from '../App';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';

function formatarReal(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatarValorInput(texto) {
  const somenteDigitos = texto.replace(/\D/g, '');
  if (!somenteDigitos) return '';
  const numero = parseInt(somenteDigitos, 10) / 100;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function diasRestantesNoMes(ano, mes) {
  const hoje = new Date();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth();
  if (ehMesAtual) {
    return Math.max(diasNoMes - hoje.getDate() + 1, 1);
  }
  return diasNoMes; // mês futuro (ou passado) — conta o mês inteiro
}

export default function HomeScreen() {
  const { ano, mes, label } = useMes();
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web' && width >= 768;
  const [dados, setDados] = useState(null);
  const [metas, setMetas] = useState([]);
  const [totalMetas, setTotalMetas] = useState(0);
  const [reservaMetasMensal, setReservaMetasMensal] = useState(0);
  const [carregando, setCarregando] = useState(true);

  // Estado da função "Posso comprar isso?"
  const [modalCompra, setModalCompra] = useState(false);
  const [valorCompra, setValorCompra] = useState('');
  const [resultadoCompra, setResultadoCompra] = useState(null);

  // useFocusEffect recarrega os dados sempre que a tela volta a ficar
  // visível — por exemplo, depois de salvar uma movimentação nova, ou
  // quando o mês selecionado muda.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      async function carregar() {
        setCarregando(true);
        const [resumo, metas] = await Promise.all([calcularResumoMensal(ano, mes), getMetas()]);
        if (ativo) {
          setDados(resumo);
          setMetas(metas);
          setTotalMetas(metas.reduce((soma, m) => soma + m.valorGuardado, 0));
          setReservaMetasMensal(metas.reduce((soma, m) => soma + m.aporteMensal, 0));
          setCarregando(false);
        }
      }
      carregar();
      return () => {
        ativo = false;
      };
    }, [ano, mes])
  );

  function abrirPossoComprar() {
    setValorCompra('');
    setResultadoCompra(null);
    setModalCompra(true);
  }

  function verificarCompra() {
    const valorNumerico = parseFloat(valorCompra.replace(/\./g, '').replace(',', '.'));
    if (!valorNumerico || valorNumerico <= 0) return;

    // O "saldo disponível pra gastar" agora desconta também o quanto já
    // está planejado ir pras metas este mês — senão a função podia
    // recomendar uma compra que na prática comeria o dinheiro da meta.
    const saldoLivre = dados.saldoLivreReal;
    const saldoAjustado = saldoLivre - reservaMetasMensal;
    const recomendado = valorNumerico <= saldoAjustado;
    const novoSaldo = saldoAjustado - valorNumerico;
    const diasRestantes = diasRestantesNoMes(ano, mes);
    const saldoPorDia = novoSaldo / diasRestantes;

    setResultadoCompra({ valorNumerico, recomendado, novoSaldo, saldoLivre, saldoAjustado, reservaMetasMensal, diasRestantes, saldoPorDia });
  }

  if (carregando || !dados) {
    return (
      <SafeAreaView style={[styles.container, styles.centro, { backgroundColor: cores.fundo }]}>
        <ActivityIndicator size="large" color={cores.primario} />
      </SafeAreaView>
    );
  }

  const d = dados;
  const alertaPrevisao = Math.max(d.saldoLivreReal - 440, 0); // estimativa simples por enquanto
  const periodoTag = `${ano}-${String(mes + 1).padStart(2, '0')}`;
  const primeiraMeta = metas[0];

  if (web) {
    return (
      <HomeWeb
        d={d}
        cores={cores}
        label={label}
        periodoTag={periodoTag}
        totalMetas={totalMetas}
        primeiraMeta={primeiraMeta}
        alertaPrevisao={alertaPrevisao}
        abrirPossoComprar={abrirPossoComprar}
        modalCompra={modalCompra}
        setModalCompra={setModalCompra}
        resultadoCompra={resultadoCompra}
        setResultadoCompra={setResultadoCompra}
        valorCompra={valorCompra}
        setValorCompra={setValorCompra}
        verificarCompra={verificarCompra}
        reservaMetasMensal={reservaMetasMensal}
        formatarValorInput={formatarValorInput}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topo}>
          <View style={styles.marcaTopo}>
            <View style={[styles.logoTopo, { backgroundColor: cores.primario }]}>
              <Ionicons name="trending-up" size={17} color="#fff" />
            </View>
            <TouchableOpacity
              delayLongPress={2000}
              onLongPress={() => {
                resetarOnboarding();
                Alert.alert('Onboarding resetado', 'Recarregue o app (balance o celular > Reload) pra ver as telas de boas-vindas de novo.');
              }}
            >
              <Text style={[styles.marcaTexto, { color: cores.texto }]}>cash</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.seletorMes}
            onPress={() => navigationRef.navigate('SelecionarMes')}
            activeOpacity={0.6}
          >
            <Text style={[styles.mesTexto, { color: cores.texto }]}>{label}</Text>
            <Ionicons name="chevron-down" size={16} color={cores.textoSecundario} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.botaoTema, { backgroundColor: cores.card }]}
            onPress={() => navigationRef.navigate('Configuracoes')}
            activeOpacity={1}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={16} color={cores.textoSecundario} />
          </TouchableOpacity>
        </View>

        <View style={styles.linhaTopo}>
          <View style={[styles.card, styles.cardSaldo, { backgroundColor: cores.card }]}>
            <Text style={[styles.cardLabel, { color: cores.textoSecundario }]}>Saldo disponível</Text>
            <Text style={[styles.saldoValor, { color: cores.texto }]}>{formatarReal(d.saldoDisponivel)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.card, styles.cardMetas, { backgroundColor: cores.card }]}
            onPress={() => navigationRef.navigate('Metas')}
            activeOpacity={0.8}
          >
            <Ionicons name="flag-outline" size={16} color={cores.primario} />
            <Text style={[styles.cardLabel, { color: cores.textoSecundario, marginTop: 6 }]}>Metas</Text>
            <Text style={[styles.metasValor, { color: cores.texto }]}>{formatarReal(totalMetas)}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: cores.card }]}>
          <View style={styles.linhaStats}>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigationRef.navigate('EditarLancamentos', { modo: 'movimentacao', tipo: 'entrada' })}
            >
              <View style={styles.statHeader}>
                <Ionicons name="arrow-up" size={12} color="#34C759" />
                <Text style={[styles.statLabel, { color: cores.textoSecundario }]}>entrou</Text>
              </View>
              <Text style={[styles.statValor, { color: cores.texto }]}>{formatarReal(d.entrou)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigationRef.navigate('EditarLancamentos', { modo: 'movimentacao', tipo: 'saida' })}
            >
              <View style={styles.statHeader}>
                <Ionicons name="arrow-down" size={12} color="#FF3B30" />
                <Text style={[styles.statLabel, { color: cores.textoSecundario }]}>gasto</Text>
              </View>
              <Text style={[styles.statValor, { color: cores.texto }]}>{formatarReal(d.gasto)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigationRef.navigate('EditarLancamentos', { modo: 'recorrente' })}
            >
              <View style={styles.statHeader}>
                <Ionicons name="calendar-outline" size={12} color={cores.textoSecundario} />
                <Text style={[styles.statLabel, { color: cores.textoSecundario }]}>previsto</Text>
              </View>
              <Text style={[styles.statValor, { color: cores.texto }]}>{formatarReal(d.previsto)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contasPagas}>
          <View style={styles.contasPagasIcone}>
            <Ionicons name="checkmark" size={16} color="#16803C" />
          </View>
          <View>
            <Text style={styles.contasPagasLabel}>Contas marcadas como pagas</Text>
            <Text style={styles.contasPagasValor}>{formatarReal(d.contasPagas || 0)}</Text>
          </View>
        </View>

        <View style={[styles.cardTeal, { backgroundColor: cores.primario }]}>
          <Text style={styles.tealLabel}>Saldo livre real</Text>
          <Text style={styles.tealValor}>{formatarReal(d.saldoLivreReal)}</Text>
          <Text style={styles.tealSub}>
            Valor seguro para gastar até o fim do mês
          </Text>
        </View>

        <View style={styles.alerta}>
          <Ionicons name="alert-circle-outline" size={18} color="#B25E09" />
          <Text style={styles.alertaTexto}>
            Continuando nesse ritmo, seu saldo livre no fim do mês fica em
            torno de {formatarReal(alertaPrevisao)}.
          </Text>
        </View>

        <TouchableOpacity style={[styles.botaoPrincipal, { backgroundColor: cores.primario }]} onPress={abrirPossoComprar}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
          <Text style={styles.botaoPrincipalTexto}>Posso comprar isso?</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalCompra} transparent animationType="fade" onRequestClose={() => setModalCompra(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { backgroundColor: cores.card }]}>
            {!resultadoCompra ? (
              <>
                <Text style={[styles.modalTitulo, { color: cores.texto }]}>Posso comprar isso?</Text>
                <Text style={[styles.modalAjuda, { color: cores.textoSecundario }]}>
                  Digite o valor da compra. Vamos comparar com o seu Saldo
                  Livre Real ({formatarReal(d.saldoLivreReal)}){reservaMetasMensal > 0 ? `, já descontando ${formatarReal(reservaMetasMensal)}/mês reservados para suas metas` : ''}, para dizer se é seguro.
                </Text>
                <View style={[styles.modalValorLinha, { borderColor: cores.borda }]}>
                  <Text style={[styles.modalPrefixo, { color: cores.textoSecundario }]}>R$</Text>
                  <TextInput
                    style={[styles.modalInput, { color: cores.texto }]}
                    keyboardType="number-pad"
                    placeholder="0,00"
                    value={valorCompra}
                    onChangeText={(texto) => setValorCompra(formatarValorInput(texto))}
                    autoFocus
                  />
                </View>
                <View style={styles.modalBotoes}>
                  <TouchableOpacity style={[styles.modalBotaoCancelar, { borderColor: cores.borda }]} onPress={() => setModalCompra(false)}>
                    <Text style={[styles.modalBotaoCancelarTexto, { color: cores.texto }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBotaoSalvar, { backgroundColor: cores.primario }, !valorCompra && styles.modalBotaoDesabilitado]}
                    onPress={verificarCompra}
                    disabled={!valorCompra}
                  >
                    <Text style={styles.modalBotaoSalvarTexto}>Verificar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.resultadoTopo}>
                  <Ionicons
                    name={resultadoCompra.recomendado ? 'checkmark-circle' : 'close-circle'}
                    size={30}
                    color={resultadoCompra.recomendado ? '#16803C' : '#DC2626'}
                  />
                  <Text style={[styles.resultadoTitulo, { color: resultadoCompra.recomendado ? '#16803C' : '#DC2626' }]}>
                    {resultadoCompra.recomendado ? 'Sim, é possível comprar' : 'Não recomendado'}
                  </Text>
                </View>

                {resultadoCompra.recomendado ? (
                  <Text style={[styles.resultadoTexto, { color: cores.texto }]}>
                    Considerando o que já está reservado para suas metas
                    {resultadoCompra.reservaMetasMensal > 0 ? ` (${formatarReal(resultadoCompra.reservaMetasMensal)}/mês)` : ''},
                    seu saldo livre pra gastos extras cai de{' '}
                    <Text style={{ fontWeight: '600' }}>{formatarReal(resultadoCompra.saldoAjustado)}</Text> para{' '}
                    <Text style={{ fontWeight: '600' }}>{formatarReal(resultadoCompra.novoSaldo)}</Text>.
                  </Text>
                ) : (
                  <Text style={[styles.resultadoTexto, { color: cores.texto }]}>
                    Considerando o que já está reservado para suas metas
                    {resultadoCompra.reservaMetasMensal > 0 ? ` (${formatarReal(resultadoCompra.reservaMetasMensal)}/mês)` : ''},
                    você tem {formatarReal(resultadoCompra.saldoAjustado)} livres pra gastos extras, mas essa compra custa{' '}
                    <Text style={{ fontWeight: '600' }}>{formatarReal(resultadoCompra.valorNumerico)}</Text>.
                    Faltariam {formatarReal(Math.abs(resultadoCompra.novoSaldo))} para
                    fazer essa compra sem mexer nas metas.
                  </Text>
                )}

                <Text style={[styles.resultadoTexto, { color: cores.texto, marginTop: 10 }]}>
                  {resultadoCompra.novoSaldo >= 0
                    ? <>Isso deixaria <Text style={{ fontWeight: '600' }}>{formatarReal(resultadoCompra.saldoPorDia)}</Text> por dia até o fim do mês ({resultadoCompra.diasRestantes} {resultadoCompra.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}).</>
                    : <>Se ainda assim comprar, ficaria <Text style={{ fontWeight: '600', color: '#DC2626' }}>{formatarReal(resultadoCompra.saldoPorDia)}</Text> por dia no negativo até o fim do mês ({resultadoCompra.diasRestantes} {resultadoCompra.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}).</>}
                </Text>

                <View style={styles.modalBotoes}>
                  <TouchableOpacity style={[styles.modalBotaoCancelar, { borderColor: cores.borda }]} onPress={() => setResultadoCompra(null)}>
                    <Text style={[styles.modalBotaoCancelarTexto, { color: cores.texto }]}>Nova consulta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBotaoSalvar, { backgroundColor: cores.primario }]} onPress={() => setModalCompra(false)}>
                    <Text style={styles.modalBotaoSalvarTexto}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function HomeWeb({
  d,
  cores,
  label,
  periodoTag,
  totalMetas,
  primeiraMeta,
  alertaPrevisao,
  abrirPossoComprar,
  modalCompra,
  setModalCompra,
  resultadoCompra,
  setResultadoCompra,
  valorCompra,
  setValorCompra,
  verificarCompra,
  reservaMetasMensal,
  formatarValorInput,
}) {
  const progressoMeta = primeiraMeta ? Math.min(primeiraMeta.valorGuardado / primeiraMeta.valorObjetivo, 1) : 0;

  return (
    <SafeAreaView style={[webStyles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={webStyles.scrollContent}>
        <View style={webStyles.topo}>
          <Text style={[webStyles.kicker, { color: cores.textoSecundario }]}>VISÃO FINANCEIRA MENSAL</Text>
          <View style={webStyles.topoDireita}>
            <TouchableOpacity
              style={[webStyles.seletorMes, { backgroundColor: cores.card, borderColor: cores.borda }]}
              onPress={() => navigationRef.navigate('SelecionarMes')}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={15} color={cores.textoSecundario} />
              <Text style={[webStyles.mesTexto, { color: cores.texto }]}>{label}</Text>
              <Ionicons name="chevron-forward" size={15} color={cores.textoSecundario} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[webStyles.botaoAdicionar, { backgroundColor: cores.primario }]}
              onPress={() => navigationRef.navigate('AdicionarMovimentacao')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={webStyles.botaoAdicionarTexto}>Novo lançamento</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[webStyles.heroKicker, { color: cores.primario }]}>SEU DINHEIRO, COM CLAREZA</Text>
        <Text style={[webStyles.heroTitulo, { color: cores.texto }]}>Um mês mais leve.</Text>
        <Text style={[webStyles.heroSubtitulo, { color: cores.textoSecundario }]}>
          Veja o que já aconteceu, o que vem pela frente e quanto realmente está livre para você.
        </Text>

        <View style={webStyles.linhaHero}>
          <View style={[webStyles.cardTealWeb, { backgroundColor: cores.primario }]}>
            <View style={webStyles.decoracaoCirculo1} />
            <View style={webStyles.decoracaoCirculo2} />
            <Text style={webStyles.tealKicker}>SALDO LIVRE REAL</Text>
            <Text style={webStyles.tealValorWeb}>{formatarReal(d.saldoLivreReal)}</Text>
            <Text style={webStyles.tealSubWeb}>
              Valor seguro para gastar depois de descontar as contas previstas e os compromissos do mês.
            </Text>
            <View style={webStyles.tealRodape}>
              <TouchableOpacity style={webStyles.pillBranco} onPress={abrirPossoComprar} activeOpacity={0.85}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={cores.primario} />
                <Text style={[webStyles.pillBrancoTexto, { color: cores.primario }]}>Posso comprar isso?</Text>
              </TouchableOpacity>
              <Text style={webStyles.periodoTag}>Período: {periodoTag}</Text>
            </View>
          </View>

          <View style={[webStyles.cardDisponivel, { backgroundColor: cores.card }]}>
            <Text style={[webStyles.kicker, { color: cores.textoSecundario }]}>SALDO DISPONÍVEL</Text>
            <Text style={[webStyles.disponivelValor, { color: cores.texto }]}>{formatarReal(d.saldoDisponivel)}</Text>
            <View style={[webStyles.divisor, { borderColor: cores.borda }]} />
            <View style={webStyles.linhaEntradaSaida}>
              <Text style={[webStyles.entradaSaidaLabel, { color: cores.textoSecundario }]}>Entrou</Text>
              <Text style={[webStyles.entradaSaidaValor, { color: cores.primario }]}>{formatarReal(d.entrou)}</Text>
            </View>
            <View style={webStyles.linhaEntradaSaida}>
              <Text style={[webStyles.entradaSaidaLabel, { color: cores.textoSecundario }]}>Gasto</Text>
              <Text style={[webStyles.entradaSaidaValor, { color: cores.texto }]}>{formatarReal(d.gasto)}</Text>
            </View>
          </View>
        </View>

        <View style={webStyles.linhaStatsWeb}>
          <View style={[webStyles.statCardWeb, { backgroundColor: cores.card }]}>
            <View style={[webStyles.statIconeWeb, { backgroundColor: 'rgba(52,199,89,0.12)' }]}>
              <Ionicons name="arrow-up-outline" size={15} color="#34C759" />
            </View>
            <Text style={[webStyles.statValorWeb, { color: cores.texto }]}>{formatarReal(d.entrou)}</Text>
            <Text style={[webStyles.statLabelWeb, { color: cores.textoSecundario }]}>Entradas no mês</Text>
          </View>
          <View style={[webStyles.statCardWeb, { backgroundColor: cores.card }]}>
            <View style={[webStyles.statIconeWeb, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
              <Ionicons name="arrow-down-outline" size={15} color="#FF3B30" />
            </View>
            <Text style={[webStyles.statValorWeb, { color: cores.texto }]}>{formatarReal(d.gasto)}</Text>
            <Text style={[webStyles.statLabelWeb, { color: cores.textoSecundario }]}>Gastos no mês</Text>
          </View>
          <View style={[webStyles.statCardWeb, { backgroundColor: cores.card }]}>
            <View style={[webStyles.statIconeWeb, { backgroundColor: 'rgba(217,119,6,0.12)' }]}>
              <Ionicons name="calendar-outline" size={15} color="#D97706" />
            </View>
            <Text style={[webStyles.statValorWeb, { color: cores.texto }]}>{formatarReal(d.previsto)}</Text>
            <Text style={[webStyles.statLabelWeb, { color: cores.textoSecundario }]}>Contas previstas</Text>
          </View>
          <View style={[webStyles.statCardWeb, { backgroundColor: cores.card }]}>
            <View style={[webStyles.statIconeWeb, { backgroundColor: 'rgba(15,118,110,0.12)' }]}>
              <Ionicons name="flag-outline" size={15} color={cores.primario} />
            </View>
            <Text style={[webStyles.statValorWeb, { color: cores.texto }]}>{formatarReal(totalMetas)}</Text>
            <Text style={[webStyles.statLabelWeb, { color: cores.textoSecundario }]}>Guardado em metas</Text>
          </View>
        </View>

        <View style={webStyles.linhaBaixo}>
          <View style={[webStyles.cardPrevisao, { backgroundColor: cores.card }]}>
            <View style={webStyles.previsaoTopo}>
              <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
              <Text style={[webStyles.kicker, { color: cores.textoSecundario }]}>Previsão do mês</Text>
            </View>
            <Text style={[webStyles.previsaoValor, { color: cores.texto }]}>{formatarReal(alertaPrevisao)}</Text>
            <View style={webStyles.alertaWeb}>
              <Text style={webStyles.alertaTextoWeb}>
                Continuando nesse ritmo, este é o saldo livre estimado para o fim do mês.
              </Text>
            </View>
          </View>

          <View style={[webStyles.cardMetasWeb, { backgroundColor: cores.card }]}>
            <View style={webStyles.metasTopoWeb}>
              <Text style={[webStyles.kicker, { color: cores.textoSecundario }]}>METAS</Text>
              <Ionicons name="flag-outline" size={16} color={cores.primario} />
            </View>
            <Text style={[webStyles.metasTituloWeb, { color: cores.texto }]}>O que você está construindo</Text>
            {primeiraMeta ? (
              <>
                <View style={webStyles.metaProgressoLinha}>
                  <Text style={[webStyles.metaNome, { color: cores.textoSecundario }]}>{primeiraMeta.nome}</Text>
                  <Text style={[webStyles.metaPercentual, { color: cores.texto }]}>{Math.round(progressoMeta * 100)}%</Text>
                </View>
                <View style={[webStyles.barraFundo, { backgroundColor: cores.fundo }]}>
                  <View style={[webStyles.barraPreenchida, { width: `${progressoMeta * 100}%`, backgroundColor: cores.primario }]} />
                </View>
                <Text style={[webStyles.metaValores, { color: cores.textoSecundario }]}>
                  {formatarReal(primeiraMeta.valorGuardado)} de {formatarReal(primeiraMeta.valorObjetivo)}
                </Text>
              </>
            ) : (
              <Text style={[webStyles.metaValores, { color: cores.textoSecundario }]}>
                Você ainda não criou nenhuma meta.
              </Text>
            )}
            <TouchableOpacity onPress={() => navigationRef.navigate('Metas')} activeOpacity={0.7}>
              <Text style={[webStyles.verMetasLink, { color: cores.primario }]}>Ver metas →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalCompra} transparent animationType="fade" onRequestClose={() => setModalCompra(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { backgroundColor: cores.card, maxWidth: 420 }]}>
            {!resultadoCompra ? (
              <>
                <Text style={[styles.modalTitulo, { color: cores.texto }]}>Posso comprar isso?</Text>
                <Text style={[styles.modalAjuda, { color: cores.textoSecundario }]}>
                  Digite o valor da compra. Vamos comparar com o seu Saldo
                  Livre Real ({formatarReal(d.saldoLivreReal)}){reservaMetasMensal > 0 ? `, já descontando ${formatarReal(reservaMetasMensal)}/mês reservados para suas metas` : ''}, para dizer se é seguro.
                </Text>
                <View style={[styles.modalValorLinha, { borderColor: cores.borda }]}>
                  <Text style={[styles.modalPrefixo, { color: cores.textoSecundario }]}>R$</Text>
                  <TextInput
                    style={[styles.modalInput, { color: cores.texto }]}
                    keyboardType="number-pad"
                    placeholder="0,00"
                    value={valorCompra}
                    onChangeText={(texto) => setValorCompra(formatarValorInput(texto))}
                    autoFocus
                  />
                </View>
                <View style={styles.modalBotoes}>
                  <TouchableOpacity style={[styles.modalBotaoCancelar, { borderColor: cores.borda }]} onPress={() => setModalCompra(false)}>
                    <Text style={[styles.modalBotaoCancelarTexto, { color: cores.texto }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBotaoSalvar, { backgroundColor: cores.primario }, !valorCompra && styles.modalBotaoDesabilitado]}
                    onPress={verificarCompra}
                    disabled={!valorCompra}
                  >
                    <Text style={styles.modalBotaoSalvarTexto}>Verificar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.resultadoTopo}>
                  <Ionicons
                    name={resultadoCompra.recomendado ? 'checkmark-circle' : 'close-circle'}
                    size={30}
                    color={resultadoCompra.recomendado ? '#16803C' : '#DC2626'}
                  />
                  <Text style={[styles.resultadoTitulo, { color: resultadoCompra.recomendado ? '#16803C' : '#DC2626' }]}>
                    {resultadoCompra.recomendado ? 'Sim, é possível comprar' : 'Não recomendado'}
                  </Text>
                </View>
                {resultadoCompra.recomendado ? (
                  <Text style={[styles.resultadoTexto, { color: cores.texto }]}>
                    Considerando o que já está reservado para suas metas
                    {resultadoCompra.reservaMetasMensal > 0 ? ` (${formatarReal(resultadoCompra.reservaMetasMensal)}/mês)` : ''},
                    seu saldo livre pra gastos extras cai de{' '}
                    <Text style={{ fontWeight: '600' }}>{formatarReal(resultadoCompra.saldoAjustado)}</Text> para{' '}
                    <Text style={{ fontWeight: '600' }}>{formatarReal(resultadoCompra.novoSaldo)}</Text>.
                  </Text>
                ) : (
                  <Text style={[styles.resultadoTexto, { color: cores.texto }]}>
                    Considerando o que já está reservado para suas metas
                    {resultadoCompra.reservaMetasMensal > 0 ? ` (${formatarReal(resultadoCompra.reservaMetasMensal)}/mês)` : ''},
                    você tem {formatarReal(resultadoCompra.saldoAjustado)} livres pra gastos extras, mas essa compra custa{' '}
                    <Text style={{ fontWeight: '600' }}>{formatarReal(resultadoCompra.valorNumerico)}</Text>.
                    Faltariam {formatarReal(Math.abs(resultadoCompra.novoSaldo))} para
                    fazer essa compra sem mexer nas metas.
                  </Text>
                )}
                <Text style={[styles.resultadoTexto, { color: cores.texto, marginTop: 10 }]}>
                  {resultadoCompra.novoSaldo >= 0
                    ? <>Isso deixaria <Text style={{ fontWeight: '600' }}>{formatarReal(resultadoCompra.saldoPorDia)}</Text> por dia até o fim do mês ({resultadoCompra.diasRestantes} {resultadoCompra.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}).</>
                    : <>Se ainda assim comprar, ficaria <Text style={{ fontWeight: '600', color: '#DC2626' }}>{formatarReal(resultadoCompra.saldoPorDia)}</Text> por dia no negativo até o fim do mês ({resultadoCompra.diasRestantes} {resultadoCompra.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}).</>}
                </Text>
                <View style={styles.modalBotoes}>
                  <TouchableOpacity style={[styles.modalBotaoCancelar, { borderColor: cores.borda }]} onPress={() => setResultadoCompra(null)}>
                    <Text style={[styles.modalBotaoCancelarTexto, { color: cores.texto }]}>Nova consulta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBotaoSalvar, { backgroundColor: cores.primario }]} onPress={() => setModalCompra(false)}>
                    <Text style={styles.modalBotaoSalvarTexto}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  seletorMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mesTexto: { fontSize: 15, fontWeight: '500' },
  botaoTema: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  logoTopo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marcaTexto: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  card: { borderRadius: 12, padding: 16, marginBottom: 10 },
  linhaTopo: { flexDirection: 'row', gap: 10 },
  cardSaldo: { flex: 1.6 },
  cardMetas: { flex: 1, alignItems: 'flex-start' },
  metasValor: { fontSize: 17, fontWeight: '600' },
  cardLabel: { fontSize: 13 },
  saldoValor: { fontSize: 28, fontWeight: '600' },
  linhaStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: { flex: 1 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  statLabel: { fontSize: 11 },
  statValor: { fontSize: 13, fontWeight: '500' },
  cardTeal: { borderRadius: 12, padding: 16, marginBottom: 10 },
  tealLabel: { fontSize: 13, color: '#CCFBF1', marginBottom: 4 },
  tealValor: { fontSize: 24, fontWeight: '600', color: '#fff' },
  tealSub: { fontSize: 12, color: '#CCFBF1', marginTop: 6 },
  contasPagas: { backgroundColor: '#EAFBEF', borderRadius: 12, padding: 13, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  contasPagasIcone: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#C9F4D6', alignItems: 'center', justifyContent: 'center' },
  contasPagasLabel: { fontSize: 12, color: '#16803C' },
  contasPagasValor: { fontSize: 16, fontWeight: '600', color: '#16803C', marginTop: 2 },
  alerta: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEF3E2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  alertaTexto: { flex: 1, fontSize: 13, color: '#B25E09', lineHeight: 19 },
  botaoPrincipal: {
    flexDirection: 'row',
    gap: 8,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  botaoPrincipalTexto: { color: '#fff', fontSize: 15, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { borderRadius: 14, padding: 20, width: '100%' },
  modalTitulo: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  modalAjuda: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  modalValorLinha: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 50, marginBottom: 18 },
  modalPrefixo: { fontSize: 18 },
  modalInput: { flex: 1, fontSize: 20, fontWeight: '600', padding: 0 },
  modalBotoes: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBotaoCancelar: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalBotaoCancelarTexto: { fontSize: 14 },
  modalBotaoSalvar: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalBotaoDesabilitado: { opacity: 0.5 },
  modalBotaoSalvarTexto: { fontSize: 14, color: '#fff', fontWeight: '600' },
  resultadoTopo: { alignItems: 'center', marginBottom: 12 },
  resultadoTitulo: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  resultadoTexto: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
});
const webStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 60, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  topoDireita: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seletorMes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 36,
  },
  mesTexto: { fontSize: 13, fontWeight: '600' },
  botaoAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    height: 36,
    paddingHorizontal: 16,
  },
  botaoAdicionarTexto: { color: '#fff', fontSize: 13, fontWeight: '600' },
  heroKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  heroTitulo: { fontSize: 34, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 8 },
  heroSubtitulo: { fontSize: 15, lineHeight: 22, maxWidth: 560, marginBottom: 28 },
  linhaHero: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  cardTealWeb: { flex: 1.6, borderRadius: 24, padding: 28, overflow: 'hidden' },
  decoracaoCirculo1: {
    position: 'absolute', top: -60, right: -40, width: 180, height: 180,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decoracaoCirculo2: {
    position: 'absolute', top: -10, right: 20, width: 100, height: 100,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tealKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: '#99F6E4', marginBottom: 10 },
  tealValorWeb: { fontSize: 40, fontWeight: '700', color: '#fff', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 10 },
  tealSubWeb: { fontSize: 13, lineHeight: 19, color: '#CCFBF1', maxWidth: 400, marginBottom: 22 },
  tealRodape: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pillBranco: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 999, height: 38, paddingHorizontal: 16,
  },
  pillBrancoTexto: { fontSize: 13, fontWeight: '600' },
  periodoTag: { fontSize: 12, color: '#99F6E4' },
  cardDisponivel: { flex: 1, borderRadius: 24, padding: 28 },
  disponivelValor: { fontSize: 26, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginTop: 8, marginBottom: 18 },
  divisor: { borderTopWidth: 1, marginBottom: 14 },
  linhaEntradaSaida: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  entradaSaidaLabel: { fontSize: 13 },
  entradaSaidaValor: { fontSize: 13, fontWeight: '600' },
  linhaStatsWeb: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  statCardWeb: { flex: 1, borderRadius: 20, padding: 20 },
  statIconeWeb: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  statValorWeb: { fontSize: 20, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 4 },
  statLabelWeb: { fontSize: 12 },
  linhaBaixo: { flexDirection: 'row', gap: 20 },
  cardPrevisao: { flex: 1, borderRadius: 20, padding: 24 },
  previsaoTopo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  previsaoValor: { fontSize: 24, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 14 },
  alertaWeb: { backgroundColor: '#FEF3E2', borderRadius: 12, padding: 14 },
  alertaTextoWeb: { fontSize: 13, color: '#B25E09', lineHeight: 19 },
  cardMetasWeb: { flex: 1, borderRadius: 20, padding: 24 },
  metasTopoWeb: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  metasTituloWeb: { fontSize: 16, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: 16 },
  metaProgressoLinha: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  metaNome: { fontSize: 13 },
  metaPercentual: { fontSize: 13, fontWeight: '600' },
  barraFundo: { height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  barraPreenchida: { height: 8, borderRadius: 999 },
  metaValores: { fontSize: 12, marginBottom: 14 },
  verMetasLink: { fontSize: 13, fontWeight: '600' },
});
