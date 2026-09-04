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
        <View style={[styles.cardTotal, { backgroundColor: cores.card }]}>
          <View style={styles.cardTotalTopo}>
            <View>
              <Text style={[styles.cardLabel, { color: cores.textoSecundario }]}>
                {abaAtiva === 'fixas' ? 'Total em contas fixas' : 'Total em gastos avulsos'}
              </Text>
              <Text style={[styles.totalValor, { color: cores.texto }]}>
                {formatarReal(abaAtiva === 'fixas' ? fixas.total : totalGastos)}
              </Text>
            </View>
            <View style={styles.iconesTopo}>
              <TouchableOpacity style={styles.botaoIconeSimples} onPress={() => navigationRef.navigate('GerenciarCategorias')}>
                <Ionicons name="pricetag-outline" size={24} color={cores.primario} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.resumoCartoes} onPress={() => navigationRef.navigate('Cartoes')}>
                <Ionicons name="card-outline" size={32} color={cores.primario} />
                <View>
                  <Text style={[styles.resumoCartoesLabel, { color: cores.textoSecundario }]}>Cartões</Text>
                  <Text style={[styles.resumoCartoesValor, { color: cores.texto }]}>{formatarReal(totalCartoes)}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
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
                  style={[styles.item, { borderBottomColor: cores.borda }, item.estaPaga && styles.itemPaga]}
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
                style={[styles.item, { borderBottomColor: cores.borda }]}
                activeOpacity={0.7}
                onPress={() => navigationRef.navigate('EditarLancamentos', { modo: 'movimentacao', tipo: 'saida', movimentacaoId: item.id })}
              >
                <View style={styles.itemEsquerda}>
                  <View style={[styles.itemIcone, { backgroundColor: cores.fundoIcone }]}>
                    <Ionicons name="wallet-outline" size={16} color={cores.primario} />
                  </View>
                  <View>
                    <Text style={[styles.itemNome, { color: cores.texto }]}>{item.nome}</Text>
                    <Text style={[styles.itemSub, { color: cores.textoSecundario }]}>{item.formaPagamento === 'debito' && item.cartaoApelido ? `${dataParaDDMM(item.data)} • Débito ${item.cartaoApelido}` : dataParaDDMM(item.data)}</Text>
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
          <View style={[webStyles.statCard, { backgroundColor: cores.card }]}>
            <Text style={[webStyles.statLabel, { color: cores.textoSecundario }]}>Contas fixas</Text>
            <Text style={[webStyles.statValor, { color: cores.texto }]}>{formatarReal(fixas.total)}</Text>
          </View>
          <View style={[webStyles.statCard, { backgroundColor: cores.card }]}>
            <Text style={[webStyles.statLabel, { color: cores.textoSecundario }]}>Gastos avulsos</Text>
            <Text style={[webStyles.statValor, { color: cores.texto }]}>{formatarReal(totalGastos)}</Text>
          </View>
          <TouchableOpacity
            style={[webStyles.statCard, { backgroundColor: cores.card }]}
            onPress={() => navigationRef.navigate('Cartões')}
            activeOpacity={0.8}
          >
            <Text style={[webStyles.statLabel, { color: cores.textoSecundario }]}>Comprometido em cartões</Text>
            <Text style={[webStyles.statValor, { color: cores.texto }]}>{formatarReal(totalCartoes)}</Text>
          </TouchableOpacity>
        </View>

        <View style={[webStyles.cardLista, { backgroundColor: cores.card }]}>
          <View style={webStyles.abas}>
            {ABAS.map((aba) => (
              <TouchableOpacity
                key={aba.chave}
                style={[webStyles.abaBotao, abaAtiva === aba.chave && { backgroundColor: cores.primario }]}
                onPress={() => setAbaAtiva(aba.chave)}
              >
                <Text style={[webStyles.abaTexto, { color: cores.textoSecundario }, abaAtiva === aba.chave && webStyles.abaTextoAtiva]}>
                  {aba.label}
                </Text>
              </TouchableOpacity>
            ))}
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
                    {item.formaPagamento === 'debito' && item.cartaoApelido ? `${dataParaDDMM(item.data)} • Débito ${item.cartaoApelido}` : dataParaDDMM(item.data)}
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
  scrollContent: { padding: 32, paddingBottom: 60, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  linhaStats: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 20, padding: 22 },
  statLabel: { fontSize: 12, marginBottom: 8 },
  statValor: { fontSize: 22, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' },
  cardLista: { borderRadius: 20, padding: 24 },
  abas: { flexDirection: 'row', gap: 6, marginBottom: 16, backgroundColor: 'rgba(148,163,184,0.12)', borderRadius: 999, padding: 4 },
  abaBotao: { flex: 1, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  abaTexto: { fontSize: 13, fontWeight: '600' },
  abaTextoAtiva: { color: '#fff' },
  vazio: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  cardTotal: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTotalTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLabel: { fontSize: 13, marginBottom: 4 },
  totalValor: { fontSize: 24, fontWeight: '600' },
  iconesTopo: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  botaoIconeSimples: { padding: 2 },
  resumoCartoes: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 8 },
  resumoCartoesLabel: { fontSize: 11 },
  resumoCartoesValor: { fontSize: 24, fontWeight: '600', marginTop: 1 },
  abas: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  abaBotao: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abaTexto: { fontSize: 12, fontWeight: '500' },
  abaTextoAtiva: { color: '#fff' },
  vazio: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
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