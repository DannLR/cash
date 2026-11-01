import React, { useState, useCallback, useEffect } from 'react';
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
import CashLogo from '../components/CashLogo';
import { useFocusEffect } from '@react-navigation/native';
import { calcularResumoMensal, getMetas, getProximosLancamentos, resetarOnboarding } from '../database/queries';
import { navigationRef } from '../App';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';
import { parseValorMoeda } from '../utils/moeda';

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
  const { cores, modoEscuro, alternarTema } = useTema();
  const { width } = useWindowDimensions();
  const [dados, setDados] = useState(null);
  const [metas, setMetas] = useState([]);
  const [lancamentosProximos, setLancamentosProximos] = useState([]);
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
        const referencia = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        const [resumo, metas, proximos] = await Promise.all([
          calcularResumoMensal(ano, mes),
          getMetas(),
          getProximosLancamentos(referencia),
        ]);
        if (ativo) {
          setDados(resumo);
          setMetas(metas);
          setLancamentosProximos(proximos);
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
    const valorNumerico = parseValorMoeda(valorCompra);
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

  if (Platform.OS === 'web' || Platform.OS === 'android' || Platform.OS === 'ios') {
    return (
      <HomeWeb
        d={d}
        cores={cores}
        modoEscuro={modoEscuro}
        alternarTema={alternarTema}
        ano={ano}
        mes={mes}
        label={label}
        lancamentos={lancamentosProximos}
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
        mobileLayout={width < 520}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topo}>
          <View style={styles.marcaTopo}>
            <CashLogo size={38} style={styles.logoTopo} />
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
                <View style={[styles.modalValorLinha, { borderColor: cores.borda, backgroundColor: cores.card }]}>
                  <Text style={[styles.modalPrefixo, { color: cores.textoSecundario }]}>R$</Text>
                  <TextInput
                    style={[styles.modalInput, { color: cores.texto, backgroundColor: cores.card }]}
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
  modoEscuro,
  alternarTema,
  label,
  lancamentos,
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
  mobileLayout = false,
}) {
  const { width } = useWindowDimensions();
  useEffect(() => {
    if (Platform.OS !== 'web' || document.getElementById('cash-glass-surfaces')) return;
    const style = document.createElement('style');
    style.id = 'cash-glass-surfaces';
    style.textContent = '[data-cash-glass="true"]{backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}';
    document.head.appendChild(style);
  }, []);
  const compactLayout = mobileLayout || width < 1080;
  const temaEscuro = cores.texto === '#FFFFFF';
  const superficieTranslucida = temaEscuro ? 'rgba(48, 43, 55, 0.52)' : 'rgba(255, 255, 255, 0.38)';
  const bordaTranslucida = temaEscuro ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.62)';
  const fundoPainel = temaEscuro ? '#1A1720' : '#E4DDEC';
  const estiloSuperficie = { backgroundColor: superficieTranslucida, borderColor: bordaTranslucida };
  const progressoMeta = primeiraMeta ? Math.min(primeiraMeta.valorGuardado / primeiraMeta.valorObjetivo, 1) : 0;
  const maiorValor = Math.max(d.entrou, d.gasto, d.previsto, 1);
  const itensProximos = [...lancamentos]
    .sort((a, b) => Number(a.dia) - Number(b.dia))
    .slice(0, 4);

  return (
    <SafeAreaView style={[webStyles.container, webStyles.glassBackdrop, { backgroundColor: fundoPainel }]}>
      <ScrollView contentContainerStyle={[webStyles.scrollContent, mobileLayout && webStyles.mobileScrollContent]}>
        <View style={[webStyles.dashboardTop, mobileLayout && webStyles.mobileDashboardTop]}>
          <View style={webStyles.brandLine}>
            <CashLogo size={36} style={webStyles.brandMark} />
            <View>
              <Text style={[webStyles.kicker, { color: cores.textoSecundario }]}>CASH · PAINEL FINANCEIRO</Text>
              <Text style={[webStyles.pageTitle, { color: cores.texto }]}>Visão geral</Text>
            </View>
          </View>
          <View style={[webStyles.topActions, mobileLayout && webStyles.mobileTopActions]}>
            <TouchableOpacity
              dataSet={Platform.OS === 'web' ? { cashGlass: 'true' } : undefined}
              style={[webStyles.monthButton, webStyles.translucentSurface, mobileLayout && webStyles.mobileMonthButton, estiloSuperficie]}
              onPress={() => navigationRef.navigate('SelecionarMes')}
              activeOpacity={0.75}
            >
              <Ionicons name="calendar-outline" size={15} color="#8B6BC5" />
              <Text style={[webStyles.monthButtonText, { color: cores.texto }]}>{label}</Text>
              <Ionicons name="chevron-down" size={14} color={cores.textoSecundario} />
            </TouchableOpacity>
            <TouchableOpacity
              dataSet={Platform.OS === 'web' ? { cashGlass: 'true' } : undefined}
              style={[webStyles.monthButton, webStyles.translucentSurface, webStyles.mobileSettingsButton, estiloSuperficie]}
              onPress={alternarTema}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={modoEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
              title={modoEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
            >
              <Ionicons name={modoEscuro ? 'sunny-outline' : 'moon-outline'} size={16} color={cores.textoSecundario} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[webStyles.addButton, mobileLayout && webStyles.mobileAddButton]}
              onPress={() => navigationRef.navigate('AdicionarMovimentacao')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={[webStyles.addButtonText, mobileLayout && webStyles.mobileAddButtonText]}>Novo lançamento</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[webStyles.balanceTopCard, mobileLayout && webStyles.mobileBalanceTopCard, { backgroundColor: '#211D28' }]}>
          <View style={webStyles.balanceMiniTop}>
            <View style={webStyles.balanceMiniIcon}><Ionicons name="wallet-outline" size={16} color="#D6C5F3" /></View>
            <Text style={webStyles.balanceMiniLabel}>SALDO DISPONÍVEL</Text>
          </View>
          <View style={[webStyles.balanceTopValues, mobileLayout && webStyles.mobileBalanceTopValues]}>
            <Text style={[webStyles.balanceMiniValue, webStyles.balanceTopValue, mobileLayout && webStyles.mobileBalanceTopValue]}>{formatarReal(d.saldoDisponivel)}</Text>
            <Text style={webStyles.balanceMiniHint}>Previsão no fim do mês: {formatarReal(alertaPrevisao)}</Text>
          </View>
        </View>

        <View style={[webStyles.dashboardGrid, compactLayout && webStyles.dashboardGridCompact]}>
          <View style={[webStyles.mainColumn, compactLayout && webStyles.columnCompact]}>
            <View style={[webStyles.heroCard, mobileLayout && webStyles.mobileHeroCard]}>
              <View style={webStyles.heroOrbLarge} />
              <View style={webStyles.heroOrbSmall} />
              <Text style={webStyles.heroEyebrow}>SEU MÊS, EM EQUILÍBRIO</Text>
              <Text style={[webStyles.heroTitle, mobileLayout && webStyles.mobileHeroTitle]}>Um plano claro para o seu dinheiro.</Text>
              <Text style={[webStyles.heroDescription, mobileLayout && webStyles.mobileHeroDescription]}>
                Acompanhe o que entrou, organize os compromissos e veja quanto pode usar com tranquilidade.
              </Text>
              <View style={[webStyles.heroFooter, mobileLayout && webStyles.mobileHeroFooter]}>
                <TouchableOpacity style={webStyles.heroButton} onPress={abrirPossoComprar} activeOpacity={0.85}>
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color="#fff" />
                  <Text style={webStyles.heroButtonText}>Posso comprar?</Text>
                </TouchableOpacity>
                <Text style={webStyles.heroPeriod}>PERÍODO · {periodoTag}</Text>
              </View>
              <View style={[webStyles.heroBalance, mobileLayout && webStyles.mobileHeroBalance]}>
                <Text style={webStyles.heroBalanceLabel}>SALDO LIVRE REAL</Text>
                <Text style={webStyles.heroBalanceValue}>{formatarReal(d.saldoLivreReal)}</Text>
                <Text style={webStyles.heroBalanceHint}>Disponível depois dos compromissos do mês</Text>
              </View>
            </View>

            <View style={[webStyles.statsRow, mobileLayout && webStyles.mobileStatsRow]}>
              <TouchableOpacity
                dataSet={Platform.OS === 'web' ? { cashGlass: 'true' } : undefined}
                style={[webStyles.metricCard, webStyles.translucentSurface, mobileLayout && webStyles.mobileMetricCard, estiloSuperficie]}
                onPress={() => navigationRef.navigate('EditarLancamentos', { modo: 'movimentacao', tipo: 'entrada' })}
                accessibilityRole="button"
                accessibilityLabel="Ver, adicionar ou editar entradas"
                activeOpacity={0.78}
              >
                <View style={webStyles.metricHeading}>
                  <View style={[webStyles.metricIcon, mobileLayout && webStyles.mobileMetricIcon, { backgroundColor: '#E8F5EF' }]}><Ionicons name="arrow-down" size={15} color="#3C9A6A" /></View>
                  <Text numberOfLines={1} style={[webStyles.metricLabel, mobileLayout && webStyles.mobileMetricLabel, { color: cores.textoSecundario }]}>Entradas</Text>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[webStyles.metricValue, mobileLayout && webStyles.mobileMetricValue, { color: cores.texto }]}>{formatarReal(d.entrou)}</Text>
                <Text numberOfLines={1} style={[webStyles.metricFoot, mobileLayout && webStyles.mobileMetricFoot]}>Recebido neste mês</Text>
              </TouchableOpacity>
              <TouchableOpacity
                dataSet={Platform.OS === 'web' ? { cashGlass: 'true' } : undefined}
                style={[webStyles.metricCard, webStyles.translucentSurface, mobileLayout && webStyles.mobileMetricCard, estiloSuperficie]}
                onPress={() => navigationRef.navigate('Contas')}
                accessibilityRole="button"
                accessibilityLabel="Abrir contas e gastos"
                activeOpacity={0.78}
              >
                <View style={webStyles.metricHeading}>
                  <View style={[webStyles.metricIcon, mobileLayout && webStyles.mobileMetricIcon, { backgroundColor: '#FCEBED' }]}><Ionicons name="arrow-up" size={15} color="#D96975" /></View>
                  <Text numberOfLines={1} style={[webStyles.metricLabel, mobileLayout && webStyles.mobileMetricLabel, { color: cores.textoSecundario }]}>Gastos</Text>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[webStyles.metricValue, mobileLayout && webStyles.mobileMetricValue, { color: cores.texto }]}>{formatarReal(d.gasto)}</Text>
                <Text numberOfLines={1} style={[webStyles.metricFoot, mobileLayout && webStyles.mobileMetricFoot]}>Lançadas + previstas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                dataSet={Platform.OS === 'web' ? { cashGlass: 'true' } : undefined}
                style={[webStyles.metricCard, webStyles.translucentSurface, mobileLayout && webStyles.mobileMetricCard, estiloSuperficie]}
                onPress={() => navigationRef.navigate('Metas')}
                activeOpacity={0.8}
              >
                <View style={webStyles.metricHeading}>
                  <View style={[webStyles.metricIcon, mobileLayout && webStyles.mobileMetricIcon, { backgroundColor: '#F1EAFB' }]}><Ionicons name="flag-outline" size={15} color="#8C6CC4" /></View>
                  <Text numberOfLines={1} style={[webStyles.metricLabel, mobileLayout && webStyles.mobileMetricLabel, { color: cores.textoSecundario }]}>Metas</Text>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[webStyles.metricValue, mobileLayout && webStyles.mobileMetricValue, { color: cores.texto }]}>{formatarReal(totalMetas)}</Text>
                <Text numberOfLines={1} style={[webStyles.metricFoot, mobileLayout && webStyles.mobileMetricFoot]}>Total guardado</Text>
              </TouchableOpacity>
            </View>

            <View dataSet={Platform.OS === 'web' ? { cashGlass: 'true' } : undefined} style={[webStyles.panelCard, webStyles.translucentSurface, estiloSuperficie]}>
              <View style={webStyles.panelHeader}>
                <View>
                  <Text style={[webStyles.panelTitle, { color: cores.texto }]}>Ritmo do mês</Text>
                  <Text style={[webStyles.panelSubtitle, { color: cores.textoSecundario }]}>Entradas, gastos e contas previstas</Text>
                </View>
                <View style={webStyles.legend}><View style={[webStyles.legendDot, { backgroundColor: '#9B7BD1' }]} /><Text style={[webStyles.legendText, { color: cores.textoSecundario }]}>Este mês</Text></View>
              </View>
              {[
                { label: 'Entradas', value: d.entrou, color: '#8E70C5' },
                { label: 'Gastos', value: d.gasto, color: '#D28AAD' },
                { label: 'Previsto', value: d.previsto, color: '#B9A8DC' },
              ].map((item) => (
                <View key={item.label} style={webStyles.barRow}>
                  <View style={webStyles.barLabelRow}>
                    <Text style={[webStyles.barLabel, { color: cores.textoSecundario }]}>{item.label}</Text>
                    <Text style={[webStyles.barValue, { color: cores.texto }]}>{formatarReal(item.value)}</Text>
                  </View>
                  <View style={[webStyles.barTrack, { backgroundColor: cores.fundo }]}>
                    <View style={[webStyles.barFill, { backgroundColor: item.color, width: `${Math.max((item.value / maiorValor) * 100, item.value > 0 ? 4 : 0)}%` }]} />
                  </View>
                </View>
              ))}
            </View>

            <View dataSet={Platform.OS === 'web' ? { cashGlass: 'true' } : undefined} style={[webStyles.goalPanel, webStyles.translucentSurface, { backgroundColor: temaEscuro ? 'rgba(115, 91, 148, 0.3)' : 'rgba(238, 232, 247, 0.78)', borderColor: temaEscuro ? 'rgba(181, 154, 222, 0.2)' : 'rgba(255, 255, 255, 0.88)' }]}>
              <View style={[webStyles.goalIcon, temaEscuro && { backgroundColor: 'rgba(181,154,222,0.18)' }]}><Ionicons name="flag-outline" size={17} color={temaEscuro ? '#D6C5F3' : '#7657AA'} /></View>
              <View style={webStyles.goalBody}>
                <Text style={[webStyles.goalEyebrow, temaEscuro && { color: '#C4AFE3' }]}>META EM DESTAQUE</Text>
                <Text style={[webStyles.goalTitle, { color: temaEscuro ? cores.texto : '#30283B' }]}>{primeiraMeta ? primeiraMeta.nome : 'Comece com uma meta'}</Text>
                {primeiraMeta ? (
                  <>
                    <View style={webStyles.goalProgressLine}>
                      <Text style={[webStyles.goalAmounts, temaEscuro && { color: '#D0C6DB' }]}>{formatarReal(primeiraMeta.valorGuardado)} de {formatarReal(primeiraMeta.valorObjetivo)}</Text>
                      <Text style={[webStyles.goalPercent, temaEscuro && { color: '#D9C9F2' }]}>{Math.round(progressoMeta * 100)}%</Text>
                    </View>
                    <View style={webStyles.goalTrack}><View style={[webStyles.goalFill, { width: `${progressoMeta * 100}%` }]} /></View>
                  </>
                ) : <Text style={[webStyles.goalAmounts, temaEscuro && { color: '#D0C6DB' }]}>Crie uma meta para acompanhar seu progresso aqui.</Text>}
              </View>
              <TouchableOpacity style={[webStyles.goalLink, temaEscuro && { backgroundColor: 'rgba(255,255,255,0.12)' }]} onPress={() => navigationRef.navigate('Metas')} activeOpacity={0.7}>
                <Ionicons name="arrow-forward" size={16} color={temaEscuro ? '#D6C5F3' : '#7657AA'} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[webStyles.sideColumn, compactLayout && webStyles.columnCompact]}>
            <View dataSet={Platform.OS === 'web' ? { cashGlass: 'true' } : undefined} style={[webStyles.activityCard, webStyles.translucentSurface, estiloSuperficie]}>
              <View style={webStyles.panelHeader}>
                <View>
                  <Text style={[webStyles.panelTitle, { color: cores.texto }]}>Próximos compromissos</Text>
                  <Text style={[webStyles.panelSubtitle, { color: cores.textoSecundario }]}>Contas do mês</Text>
                </View>
                <TouchableOpacity onPress={() => navigationRef.navigate('Planejamento')} accessibilityLabel="Ver planejamento">
                  <Ionicons name="arrow-forward" size={16} color="#7657AA" />
                </TouchableOpacity>
              </View>
              {itensProximos.length ? itensProximos.map((item, index) => (
                <View key={`${item.nome}-${item.dia}-${index}`} style={[webStyles.upcomingRow, { borderBottomColor: cores.borda }]}>
                  <View style={webStyles.dueDate}><Text style={webStyles.dueDateDay}>{item.dia}</Text><Text style={webStyles.dueDateMonth}>{label.slice(0, 3)}</Text></View>
                  <View style={webStyles.upcomingBody}>
                    <Text numberOfLines={1} style={[webStyles.upcomingName, { color: cores.texto }]}>{item.nome}</Text>
                    <Text style={[webStyles.upcomingType, { color: cores.textoSecundario }]}>{item.tipo === 'assinatura' ? 'Assinatura' : item.tipo === 'parcela' ? 'Parcela' : 'Conta fixa'}</Text>
                  </View>
                  <Text style={[webStyles.upcomingValue, { color: cores.texto }]}>{formatarReal(Math.abs(item.valor))}</Text>
                </View>
              )) : (
                <View style={webStyles.emptyUpcoming}>
                  <View style={webStyles.emptyIcon}><Ionicons name="checkmark" size={15} color="#7657AA" /></View>
                  <Text style={[webStyles.emptyText, { color: cores.textoSecundario }]}>Nenhuma conta recorrente neste mês.</Text>
                </View>
              )}
              <TouchableOpacity style={webStyles.allBillsButton} onPress={() => navigationRef.navigate('Contas')} activeOpacity={0.75}>
                <Text style={webStyles.allBillsText}>Ver todas as contas</Text><Ionicons name="arrow-forward" size={14} color="#7657AA" />
              </TouchableOpacity>
            </View>

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
                <View style={[styles.modalValorLinha, { borderColor: cores.borda, backgroundColor: cores.card }]}>
                  <Text style={[styles.modalPrefixo, { color: cores.textoSecundario }]}>R$</Text>
                  <TextInput
                    style={[styles.modalInput, { color: cores.texto, backgroundColor: cores.card }]}
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
    flexShrink: 0,
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
  glassBackdrop: { position: 'relative', overflow: 'hidden' },
  scrollContent: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40, maxWidth: 1480, width: '100%', alignSelf: 'center' },
  mobileScrollContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 92 },
  dashboardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  mobileDashboardTop: { flexDirection: 'column', alignItems: 'stretch', gap: 12, marginBottom: 16 },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandMark: { flexShrink: 0 },
  pageTitle: { fontSize: 21, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginTop: 2 },
  kicker: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mobileTopActions: { width: '100%', gap: 8 },
  balanceTopCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 13, marginBottom: 16 },
  mobileBalanceTopCard: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  balanceTopValues: { alignItems: 'flex-end' },
  mobileBalanceTopValues: { alignItems: 'flex-start', paddingLeft: 38 },
  balanceTopValue: { marginTop: 0 },
  mobileBalanceTopValue: { fontSize: 20 },
  monthButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 38 },
  mobileMonthButton: { flex: 1, justifyContent: 'center', height: 36, paddingHorizontal: 9, gap: 6 },
  mobileSettingsButton: { width: 36, height: 36, paddingHorizontal: 0, justifyContent: 'center' },
  monthButtonText: { fontSize: 12, fontWeight: '600' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, height: 38, paddingHorizontal: 13, backgroundColor: '#211D28' },
  mobileAddButton: { height: 36, paddingHorizontal: 10, gap: 4 },
  addButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  mobileAddButtonText: { fontSize: 10 },
  translucentSurface: {
    borderWidth: 1,
    shadowColor: '#4C3B63',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.045,
    shadowRadius: 14,
    elevation: 2,
  },
  dashboardGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  dashboardGridCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 14 },
  mainColumn: { flex: 1.8, gap: 14, minWidth: 0 },
  sideColumn: { flex: 1, gap: 14, minWidth: 0, maxWidth: 360 },
  columnCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%', maxWidth: '100%', minWidth: 0 },
  heroCard: { minHeight: 248, overflow: 'hidden', position: 'relative', borderRadius: 20, padding: 22, backgroundColor: '#B9A4E5' },
  mobileHeroCard: { minHeight: 0, borderRadius: 18, padding: 17 },
  heroOrbLarge: { position: 'absolute', right: -30, top: -75, width: 210, height: 210, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroOrbSmall: { position: 'absolute', right: 46, top: 58, width: 108, height: 108, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.14)' },
  heroEyebrow: { fontSize: 9, letterSpacing: 1.4, color: '#554273', fontWeight: '700', marginBottom: 8 },
  heroTitle: { fontSize: 24, lineHeight: 29, fontWeight: '700', color: '#241D30', fontFamily: 'Space Grotesk, sans-serif', maxWidth: 430 },
  mobileHeroTitle: { fontSize: 20, lineHeight: 25 },
  heroDescription: { fontSize: 12, lineHeight: 18, color: '#493C60', maxWidth: 460, marginTop: 7 },
  mobileHeroDescription: { fontSize: 11, lineHeight: 16 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  mobileHeroFooter: { flexWrap: 'wrap', gap: 8, marginTop: 13 },
  heroButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, height: 34, borderRadius: 999, backgroundColor: '#211D28' },
  heroButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  heroPeriod: { color: '#554273', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  heroBalance: { position: 'absolute', right: 22, bottom: 22, alignItems: 'flex-end' },
  mobileHeroBalance: { position: 'relative', right: 0, bottom: 0, alignItems: 'flex-start', alignSelf: 'flex-start', marginTop: 14 },
  heroBalanceLabel: { color: '#554273', fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
  heroBalanceValue: { color: '#241D30', fontSize: 25, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginTop: 3 },
  heroBalanceHint: { color: '#554273', fontSize: 9, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12 },
  mobileStatsRow: { gap: 7 },
  metricCard: { flex: 1, minWidth: 0, borderRadius: 16, padding: 14, minHeight: 104 },
  mobileMetricCard: { padding: 9, minHeight: 88, borderRadius: 13 },
  metricHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  mobileMetricIcon: { width: 22, height: 22, borderRadius: 7 },
  metricIcon: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 11, fontWeight: '600' },
  mobileMetricLabel: { fontSize: 9 },
  metricValue: { fontSize: 16, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginTop: 11 },
  mobileMetricValue: { fontSize: 12, marginTop: 8 },
  metricFoot: { color: '#97919F', fontSize: 9, marginTop: 3 },
  mobileMetricFoot: { fontSize: 7, marginTop: 2 },
  panelCard: { borderRadius: 16, padding: 17 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  panelTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' },
  panelSubtitle: { fontSize: 10, marginTop: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 9 },
  barRow: { marginBottom: 11 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barLabel: { fontSize: 10 },
  barValue: { fontSize: 10, fontWeight: '600' },
  barTrack: { height: 7, overflow: 'hidden', borderRadius: 999 },
  barFill: { height: 7, borderRadius: 999 },
  goalPanel: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, padding: 15 },
  goalIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(118,87,170,0.12)', alignItems: 'center', justifyContent: 'center' },
  goalBody: { flex: 1, minWidth: 0 },
  goalEyebrow: { fontSize: 8, letterSpacing: 1.1, fontWeight: '700', color: '#8065A8' },
  goalTitle: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  goalProgressLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  goalAmounts: { fontSize: 9, color: '#786B88', marginTop: 5 },
  goalPercent: { fontSize: 9, fontWeight: '700', color: '#62478F' },
  goalTrack: { height: 5, borderRadius: 999, backgroundColor: 'rgba(118,87,170,0.15)', marginTop: 5, overflow: 'hidden' },
  goalFill: { height: 5, borderRadius: 999, backgroundColor: '#9272C7' },
  goalLink: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  activityCard: { borderRadius: 16, padding: 17 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: 1 },
  dueDate: { width: 34, height: 38, borderRadius: 10, backgroundColor: '#F1EBF8', alignItems: 'center', justifyContent: 'center' },
  dueDateDay: { color: '#62478F', fontSize: 13, fontWeight: '700' },
  dueDateMonth: { color: '#9272C7', fontSize: 7, textTransform: 'uppercase', marginTop: 1 },
  upcomingBody: { flex: 1, minWidth: 0 },
  upcomingName: { fontSize: 10, fontWeight: '600' },
  upcomingType: { fontSize: 8, marginTop: 3 },
  upcomingValue: { fontSize: 9, fontWeight: '700' },
  emptyUpcoming: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12 },
  emptyIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#F1EBF8', alignItems: 'center', justifyContent: 'center' },
  emptyText: { flex: 1, fontSize: 10, lineHeight: 15 },
  allBillsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderTopWidth: 0, paddingTop: 12 },
  allBillsText: { color: '#7657AA', fontSize: 10, fontWeight: '700' },
  balanceMiniTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceMiniIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#38303F', alignItems: 'center', justifyContent: 'center' },
  balanceMiniLabel: { color: '#C3B5D6', fontSize: 8, letterSpacing: 1, fontWeight: '700' },
  balanceMiniValue: { color: '#fff', fontSize: 19, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginTop: 12 },
  balanceMiniHint: { color: '#B4AABB', fontSize: 9, marginTop: 4 },
});
