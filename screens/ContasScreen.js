import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getContasFixas, getGastosAvulsos, getResumoCartoes, alternarContaPaga, getMapaCategorias } from '../database/queries';
import { navigationRef } from '../App';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';

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