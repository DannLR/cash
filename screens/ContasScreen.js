import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getContasFixas, getGastosAvulsos, getResumoCartoes, alternarContaPaga, getMapaCategorias } from '../database/queries';
import { navigationRef } from '../App';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';
import WebPageHeader from '../components/WebPageHeader';
import PageIntro from '../components/PageIntro';

function formatarReal(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataParaDDMM(iso) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const ABAS = [
  { chave: 'fixas', label: 'Fixas' },
  { chave: 'gastos', label: 'Gastos' },
];

export default function ContasScreen() {
  const { referencia } = useMes();
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const web = Platform.OS === 'web' && width >= 768;
  const [abaAtiva, setAbaAtiva] = useState('fixas');
  const [fixas, setFixas] = useState({ itens: [], total: 0 });
  const [gastos, setGastos] = useState([]);
  const [totalCartoes, setTotalCartoes] = useState(0);
  const [mapaCategorias, setMapaCategorias] = useState({});
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      async function carregar() {
        setCarregando(true);
        const [dadosFixas, dadosGastos, cartoes, mapa] = await Promise.all([
          getContasFixas(referencia),
          getGastosAvulsos(referencia),
          getResumoCartoes(referencia),
          getMapaCategorias(),
        ]);
        if (ativo) {
          setFixas(dadosFixas);
          setGastos(dadosGastos);
          setTotalCartoes(cartoes.reduce((soma, cartao) => soma + cartao.total, 0));
          setMapaCategorias(mapa);
          setCarregando(false);
        }
      }
      carregar();
      return () => { ativo = false; };
    }, [referencia])
  );

  if (carregando) {
    return (
      <SafeAreaView style={[styles.container, styles.centro, { backgroundColor: cores.fundo }]}>
        <ActivityIndicator size="large" color={cores.primario} />
      </SafeAreaView>
    );
  }

  const totalGastos = gastos.reduce((s, g) => s + g.valor, 0);

  async function marcarComoPaga(item) {
    await alternarContaPaga(item.id, referencia, item.estaPaga);
    const dadosFixas = await getContasFixas(referencia);
    setFixas(dadosFixas);
  }

  if (web) {
    return (
      <ContasWeb
        cores={cores}
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        fixas={fixas}
        gastos={gastos}
        totalGastos={totalGastos}
        totalCartoes={totalCartoes}
        mapaCategorias={mapaCategorias}
        marcarComoPaga={marcarComoPaga}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.cardTotal, { backgroundColor: cores.card, borderColor: cores.borda }]}>
          <Text style={[styles.cardLabel, { color: cores.textoSecundario }]}>
            {abaAtiva === 'fixas' ? 'Total em contas fixas' : 'Total em gastos avulsos'}
          </Text>
          <Text style={[styles.totalValor, { color: cores.texto }]}>
            {formatarReal(abaAtiva === 'fixas' ? fixas.total : totalGastos)}
          </Text>
        </View>

        <View style={styles.acoesRapidas}>
          <TouchableOpacity
            style={[styles.acaoRapida, { backgroundColor: cores.card, borderColor: cores.borda }]}
            onPress={() => navigationRef.navigate('GerenciarCategorias')}
            activeOpacity={0.78}
          >
            <View style={[styles.acaoIcone, { backgroundColor: cores.fundoIcone }]}><Ionicons name="pricetag-outline" size={19} color={cores.primario} /></View>
            <View style={styles.acaoTextoBloco}>
              <Text style={[styles.acaoTitulo, { color: cores.texto }]}>Categorias</Text>
              <Text style={[styles.acaoSubtitulo, { color: cores.textoSecundario }]}>Gerenciar</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={cores.textoSecundario} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acaoRapida, { backgroundColor: cores.card, borderColor: cores.borda }]}
            onPress={() => navigationRef.navigate('Cartoes')}
            activeOpacity={0.78}
          >
            <View style={[styles.acaoIcone, { backgroundColor: cores.fundoIcone }]}><Ionicons name="card-outline" size={19} color={cores.primario} /></View>
            <View style={styles.acaoTextoBloco}>
              <Text style={[styles.acaoTitulo, { color: cores.texto }]}>Cartões</Text>
              <Text style={[styles.acaoSubtitulo, { color: cores.textoSecundario }]}>{formatarReal(totalCartoes)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={cores.textoSecundario} />
          </TouchableOpacity>
        </View>

        <View style={styles.abas}>
          {ABAS.map((aba) => (
            <TouchableOpacity
              key={aba.chave}
              style={[styles.abaBotao, { backgroundColor: cores.card }, abaAtiva === aba.chave && { backgroundColor: cores.primario }]}
              onPress={() => setAbaAtiva(aba.chave)}
            >
              <Text style={[styles.abaTexto, { color: cores.texto }, abaAtiva === aba.chave && styles.abaTextoAtiva]}>{aba.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {abaAtiva === 'fixas' && (
          <>
            {fixas.itens.length === 0 && <Text style={[styles.vazio, { color: cores.textoSecundario }]}>Nenhuma conta fixa cadastrada ainda.</Text>}
            {fixas.itens.map((item) => {
              const info = mapaCategorias[`saida:${item.categoriaNome || item.nome}`];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.item, { backgroundColor: cores.card, borderColor: cores.borda }, item.estaPaga && styles.itemPaga]}
                  activeOpacity={0.7}
                  onPress={() => navigationRef.navigate('EditarLancamentos', { modo: 'recorrente', contaId: item.id })}
                >
                  <View style={styles.itemEsquerda}>
                    <View style={[styles.itemIcone, { backgroundColor: info ? info.cor : cores.fundoIcone }]}>
                      <Ionicons name={info ? info.icone : 'home-outline'} size={16} color={info ? '#fff' : cores.primario} />
                    </View>
                    <View>
                      <Text style={[styles.itemNome, { color: cores.texto }]}>{item.nome}</Text>
                      <Text style={[styles.itemSub, { color: cores.textoSecundario }]}>dia {item.diaVencimento}</Text>
                    </View>
                  </View>
                  <View style={styles.itemDireita}>
                    <Text style={[styles.itemValor, { color: cores.texto }]}>{formatarReal(item.valor)}</Text>
                    <TouchableOpacity
                      style={[styles.caixaPaga, item.estaPaga && styles.caixaPagaAtiva]}
                      onPress={() => marcarComoPaga(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {item.estaPaga && <Ionicons name="checkmark" size={15} color="#fff" />}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.botaoNovo, { borderColor: cores.primario }]}
              onPress={() => navigationRef.navigate('AdicionarContaRecorrente')}
            >
              <Ionicons name="add" size={16} color={cores.primario} />
              <Text style={[styles.botaoNovoTexto, { color: cores.primario }]}>Nova conta fixa</Text>
            </TouchableOpacity>
          </>
        )}

        {abaAtiva === 'gastos' && (
          <>
            {gastos.length === 0 && <Text style={[styles.vazio, { color: cores.textoSecundario }]}>Nenhum gasto avulso este mês ainda.</Text>}
            {gastos.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.item, { backgroundColor: cores.card, borderColor: cores.borda }]}
                activeOpacity={0.7}
                onPress={() => navigationRef.navigate('EditarLancamentos', { modo: 'movimentacao', tipo: 'saida', movimentacaoId: item.id })}
              >
                <View style={styles.itemEsquerda}>
                  <View style={[styles.itemIcone, { backgroundColor: cores.fundoIcone }]}>
                    <Ionicons name="wallet-outline" size={16} color={cores.primario} />
                  </View>
                  <View>
                    <Text style={[styles.itemNome, { color: cores.texto }]}>{item.nome}</Text>
                    <Text style={[styles.itemSub, { color: cores.textoSecundario }]}>{item.origem === 'notificacao' ? `${dataParaDDMM(item.data)} • ${item.descricao || 'Compra por notificação'}` : item.origem === 'comprovante' ? `${dataParaDDMM(item.data)} • ${item.descricao || 'Via comprovante'}` : item.formaPagamento === 'debito' && item.cartaoApelido ? `${dataParaDDMM(item.data)} • Débito ${item.cartaoApelido}` : dataParaDDMM(item.data)}</Text>
                  </View>
                </View>
                <Text style={[styles.itemValor, { color: cores.texto }]}>{formatarReal(item.valor)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.botaoNovo, { borderColor: cores.primario }]} onPress={() => navigationRef.navigate('AdicionarMovimentacao')}>
              <Ionicons name="add" size={16} color={cores.primario} />
              <Text style={[styles.botaoNovoTexto, { color: cores.primario }]}>Novo gasto</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ContasWeb({ cores, abaAtiva, setAbaAtiva, fixas, gastos, totalGastos, totalCartoes, mapaCategorias, marcarComoPaga }) {
  const listaAtiva = abaAtiva === 'fixas' ? fixas.itens : gastos;

  return (
    <SafeAreaView style={[webStyles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={webStyles.scrollContent}>
        <WebPageHeader acaoTexto="Novo gasto" aoAcionar={() => navigationRef.navigate('AdicionarMovimentacao', { tipo: 'saida' })} />
        <PageIntro
          kicker="ENTRADAS E COMPROMISSOS"
          titulo="Contas"
          subtitulo="Tudo que saiu, está previsto ou precisa da sua atenção."
          cores={cores}
        />

        <View style={webStyles.linhaStats}>
          <TouchableOpacity
            style={[webStyles.statCard, { backgroundColor: cores.card }, abaAtiva === 'fixas' && webStyles.statCardAtivo]}
            onPress={() => setAbaAtiva('fixas')}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Mostrar contas fixas"
          >
            <Text style={[webStyles.statLabel, { color: cores.textoSecundario }]}>Contas fixas</Text>
            <Text style={[webStyles.statValor, { color: cores.texto }]}>{formatarReal(fixas.total)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[webStyles.statCard, { backgroundColor: cores.card }, abaAtiva === 'gastos' && webStyles.statCardAtivo]}
            onPress={() => setAbaAtiva('gastos')}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Mostrar gastos avulsos"
          >
            <Text style={[webStyles.statLabel, { color: cores.textoSecundario }]}>Gastos avulsos</Text>
            <Text style={[webStyles.statValor, { color: cores.texto }]}>{formatarReal(totalGastos)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[webStyles.statCard, { backgroundColor: cores.card }]}
            onPress={() => navigationRef.navigate('Cartões')}
            activeOpacity={0.8}
          >
            <Text style={[webStyles.statLabel, { color: cores.textoSecundario }]}>Cartão</Text>
            <Text style={[webStyles.statValor, { color: cores.texto }]}>{formatarReal(totalCartoes)}</Text>
          </TouchableOpacity>
        </View>

        <View style={[webStyles.cardLista, { backgroundColor: cores.card }]}>
          <View style={webStyles.listaHeader}>
            <Text style={[webStyles.listaTitulo, { color: cores.texto }]}>{abaAtiva === 'fixas' ? 'Contas fixas' : 'Gastos avulsos'}</Text>
            <Text style={[webStyles.listaContagem, { color: cores.textoSecundario }]}>{listaAtiva.length} {listaAtiva.length === 1 ? 'item' : 'itens'}</Text>
          </View>

          {listaAtiva.length === 0 && (
            <Text style={[webStyles.vazio, { color: cores.textoSecundario }]}>
              {abaAtiva === 'fixas' ? 'Nenhuma conta fixa cadastrada ainda.' : 'Nenhum gasto avulso este mês ainda.'}
            </Text>
          )}

          {abaAtiva === 'fixas' && fixas.itens.map((item) => {
            const info = mapaCategorias[`saida:${item.categoriaNome || item.nome}`];
            return (
              <TouchableOpacity
                key={item.id}
                style={[webStyles.item, { borderBottomColor: cores.borda }]}
                activeOpacity={0.7}
                onPress={() => navigationRef.navigate('EditarLancamentos', { modo: 'recorrente', contaId: item.id })}
              >
                <View style={webStyles.itemEsquerda}>
                  <View style={[webStyles.itemIcone, { backgroundColor: info ? info.cor : cores.fundoIcone }]}>
                    <Ionicons name={info ? info.icone : 'home-outline'} size={16} color={info ? '#fff' : cores.primario} />
                  </View>
                  <View>
                    <Text style={[webStyles.itemNome, { color: cores.texto }]}>{item.nome}</Text>
                    <Text style={[webStyles.itemSub, { color: cores.textoSecundario }]}>vence dia {item.diaVencimento}</Text>
                  </View>
                </View>
                <View style={webStyles.itemDireita}>
                  <Text style={[webStyles.itemValor, { color: cores.texto }]}>{formatarReal(item.valor)}</Text>
                  <TouchableOpacity
                    style={[webStyles.caixaPaga, item.estaPaga && webStyles.caixaPagaAtiva]}
                    onPress={() => marcarComoPaga(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {item.estaPaga && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}

          {abaAtiva === 'gastos' && gastos.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[webStyles.item, { borderBottomColor: cores.borda }]}
              activeOpacity={0.7}
              onPress={() => navigationRef.navigate('EditarLancamentos', { modo: 'movimentacao', tipo: 'saida', movimentacaoId: item.id })}
            >
              <View style={webStyles.itemEsquerda}>
                <View style={[webStyles.itemIcone, { backgroundColor: cores.fundoIcone }]}>
                  <Ionicons name="wallet-outline" size={16} color={cores.primario} />
                </View>
                <View>
                  <Text style={[webStyles.itemNome, { color: cores.texto }]}>{item.nome}</Text>
                  <Text style={[webStyles.itemSub, { color: cores.textoSecundario }]}>
                    {item.origem === 'notificacao' ? `${dataParaDDMM(item.data)} • ${item.descricao || 'Compra por notificação'}` : item.formaPagamento === 'debito' && item.cartaoApelido ? `${dataParaDDMM(item.data)} • Débito ${item.cartaoApelido}` : dataParaDDMM(item.data)}
                  </Text>
                </View>
              </View>
              <Text style={[webStyles.itemValor, { color: cores.texto }]}>{formatarReal(item.valor)}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[webStyles.botaoNovo, { borderColor: cores.primario }]}
            onPress={() => navigationRef.navigate(abaAtiva === 'fixas' ? 'AdicionarContaRecorrente' : 'AdicionarMovimentacao', abaAtiva === 'fixas' ? {} : { tipo: 'saida' })}
          >
            <Ionicons name="add" size={16} color={cores.primario} />
            <Text style={[webStyles.botaoNovoTexto, { color: cores.primario }]}>
              {abaAtiva === 'fixas' ? 'Nova conta fixa' : 'Novo gasto'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48, maxWidth: 960, width: '100%', alignSelf: 'center' },
  linhaStats: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 20, padding: 22, borderWidth: 1, borderColor: 'transparent' },
  statCardAtivo: { borderColor: '#8665B5' },
  statLabel: { fontSize: 12, marginBottom: 8 },
  statValor: { fontSize: 22, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' },
  cardLista: { borderRadius: 20, padding: 24 },
  listaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  listaTitulo: { fontSize: 14, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' },
  listaContagem: { fontSize: 10 },
  vazio: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  itemEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcone: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemNome: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 12, marginTop: 1 },
  itemValor: { fontSize: 14, fontWeight: '600' },
  itemDireita: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  caixaPaga: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#C7C7CC', alignItems: 'center', justifyContent: 'center' },
  caixaPagaAtiva: { backgroundColor: '#16803C', borderColor: '#16803C' },
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
  botaoNovoTexto: { fontSize: 14, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 18, paddingTop: 12, paddingBottom: 40, width: '100%', maxWidth: 780, alignSelf: 'center', alignItems: 'center' },
  cardTotal: { width: '100%', maxWidth: 740, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(134,101,181,0.08)' },
  cardTotalTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabel: { fontSize: 13, marginBottom: 4 },
  totalValor: { fontSize: 24, fontWeight: '600' },
  acoesRapidas: { width: '100%', maxWidth: 740, flexDirection: 'row', gap: 10, marginBottom: 14 },
  acaoRapida: { flex: 1, minWidth: 0, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10 },
  acaoIcone: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  acaoTextoBloco: { flex: 1, minWidth: 0 },
  acaoTitulo: { fontSize: 12, fontWeight: '700' },
  acaoSubtitulo: { fontSize: 9, marginTop: 3 },
  abas: { width: '100%', maxWidth: 740, flexDirection: 'row', gap: 8, marginBottom: 14 },
  abaBotao: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abaTexto: { fontSize: 12, fontWeight: '500' },
  abaTextoAtiva: { color: '#fff' },
  vazio: { width: '100%', maxWidth: 740, fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  item: {
    width: '100%',
    maxWidth: 740,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 13,
    borderWidth: 1,
  },
  itemPaga: { backgroundColor: '#EAFBEF', borderRadius: 10, paddingHorizontal: 8 },
  itemEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemIcone: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNome: { fontSize: 14, fontWeight: '500' },
  itemSub: { fontSize: 12 },
  itemValor: { fontSize: 14, fontWeight: '500' },
  itemDireita: { flexDirection: 'row', alignItems: 'center' },
  caixaPaga: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: '#C7C7CC', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  caixaPagaAtiva: { backgroundColor: '#16803C', borderColor: '#16803C' },
  botaoNovo: {
    width: '100%',
    maxWidth: 740,
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
