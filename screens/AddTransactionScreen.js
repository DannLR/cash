import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CampoData from '../components/CampoData';
import { salvarMovimentacao, salvarContaRecorrente, getCartoes, getMapaCategorias } from '../database/queries';
import { useTema } from '../context/ThemeContext';

const CATEGORIAS_ENTRADA = ['Salário', 'Comissão', 'Renda extra', 'Outros'];
const CATEGORIAS_SAIDA = [
  'Aluguel', 'Energia', 'Internet', 'Água', 'Academia', 'Assinaturas',
  'Mercado', 'Combustível', 'Restaurantes', 'Lazer', 'Compras', 'Outros',
];
const FORMAS_PAGAMENTO = [
  { chave: 'pix', label: 'Pix', icone: 'qr-code-outline' },
  { chave: 'debito', label: 'Débito', icone: 'card-outline' },
  { chave: 'dinheiro', label: 'Dinheiro', icone: 'cash-outline' },
  { chave: 'credito', label: 'Crédito', icone: 'card' },
  { chave: 'boleto', label: 'Boleto', icone: 'barcode-outline' },
];

// Mesmas cores usadas na pilha de cartões da tela "Cartões", para o
// seletor aqui parecer visualmente com a carteira de verdade.
const CORES_CARTAO = ['#1C1C1E', '#284B63', '#6B3E26', '#3F3B75'];

function hojeFormatado() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${hoje.getFullYear()}`;
}

function dataParaDate(texto) {
  const [dia, mes, ano] = texto.split('/');
  return new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
}

function formatarData(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

// Transforma o texto digitado (só dígitos importam) num valor formatado
// como "940,22" — os dois últimos dígitos sempre viram os centavos.
function formatarValorInput(texto) {
  const somenteDigitos = texto.replace(/\D/g, '');
  if (!somenteDigitos) return '';
  const numero = parseInt(somenteDigitos, 10) / 100;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Card colorido do cartão, no mesmo estilo da pilha da tela "Cartões" —
// só que compacto, para uso dentro do fluxo de lançamento.
function CardSelecionavel({ cartao, cor, selecionado, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.cartaoCard, { backgroundColor: cor }, selecionado && styles.cartaoCardSelecionado]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View style={styles.cartaoCardTopo}>
        <Text style={styles.cartaoCardBandeira}>{cartao.bandeira}</Text>
        <Ionicons name="card" size={18} color="rgba(255,255,255,0.85)" />
      </View>
      <Text style={styles.cartaoCardNumero}>
        {cartao.ultimos_digitos ? `••••  ${cartao.ultimos_digitos}` : '••••  ••••'}
      </Text>
      <Text style={styles.cartaoCardNome}>{cartao.apelido}</Text>
      {selecionado && (
        <View style={styles.cartaoCardCheck}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AddTransactionScreen({ navigation, route }) {
  const { cores } = useTema();
  // O tipo não é mais escolhido nesta tela: por padrão toda movimentação
  // criada aqui é uma saída. A única forma de criar uma entrada é pelo
  // botão "Nova entrada" na lista de Entradas (Home > "entrou"), que passa
  // tipo: 'entrada' explicitamente.
  const tipo = route.params?.tipo === 'entrada' ? 'entrada' : 'saida';
  // Vindos do lançamento por voz: já pulam pra etapa certa, mas continuam
  // totalmente editáveis — a interpretação por palavras-chave não é perfeita.
  const valorInicial = route.params?.valorInicial || '';
  const categoriaInicial = route.params?.categoriaInicial || null;
  const passoInicial = valorInicial && categoriaInicial ? 3 : valorInicial ? 2 : 1;
  const [passo, setPasso] = useState(passoInicial);
  const [valor, setValor] = useState(valorInicial);
  const [categoria, setCategoria] = useState(categoriaInicial);
  const [categoriaCustom, setCategoriaCustom] = useState('');
  const [data, setData] = useState(hojeFormatado());
  const [forma, setForma] = useState(null);
  const [cartoes, setCartoes] = useState([]);
  const [cartaoId, setCartaoId] = useState(null);
  const [parcelas, setParcelas] = useState('1');
  const [destino, setDestino] = useState('gasto'); // 'gasto' | 'fixa' — só pra pix/dinheiro/boleto
  const [salvando, setSalvando] = useState(false);
  const [mapaCategorias, setMapaCategorias] = useState({});

  useEffect(() => { getCartoes().then(setCartoes); }, []);
  useEffect(() => { getMapaCategorias().then(setMapaCategorias); }, []);

  const categorias = tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  const categoriaFinal = categoria === 'Outros' ? categoriaCustom : categoria;

  // Uma compra no crédito não é um gasto avulso: ela vira uma parcela de
  // verdade (mesmo que seja "à vista", 1x), vinculada ao cartão escolhido.
  // Por isso ela aparece em Cartões e no "previsto" — não em "Gastos", que
  // é reservado para Débito, Pix e Dinheiro.
  const ehCredito = tipo === 'saida' && forma === 'credito';

  // Pix, Dinheiro e Boleto podem ser tanto um gasto avulso quanto, na
  // real, uma conta fixa recorrente (ex: aluguel pago por Pix) — só faz
  // sentido oferecer essa escolha pra saídas.
  const podeVirarFixa = tipo === 'saida' && ['pix', 'dinheiro', 'boleto'].includes(forma);

  function podeAvancar() {
    if (passo === 1) return !!valor && parseFloat(valor.replace(',', '.')) > 0;
    if (passo === 2) return categoria === 'Outros' ? !!categoriaCustom.trim() : !!categoria;
    if (passo === 3) {
      const cartaoOk = !['debito', 'credito'].includes(forma) || !!cartaoId;
      const parcelasOk = !ehCredito || (parseInt(parcelas, 10) >= 1);
      return !!data && !!forma && cartaoOk && parcelasOk;
    }
    return false;
  }

  async function avancar() {
    if (passo < 3) {
      setPasso(passo + 1);
      return;
    }

    setSalvando(true);
    try {
      const [diaStr, mesStr, anoStr] = data.split('/');
      const dataIso = new Date(
        parseInt(anoStr, 10),
        parseInt(mesStr, 10) - 1,
        parseInt(diaStr, 10)
      ).toISOString();
      const valorTotal = parseFloat(valor.replace(',', '.'));

      if (ehCredito) {
        const numeroParcelas = parseInt(parcelas, 10) || 1;
        const valorPorParcela = Math.round((valorTotal / numeroParcelas) * 100) / 100;
        const cartaoEscolhido = cartoes.find((c) => c.id === cartaoId);
        // Usa o dia de vencimento do próprio cartão, se cadastrado;
        // senão, cai no dia da compra como aproximação.
        const diaVencimento = cartaoEscolhido?.dia_vencimento || parseInt(diaStr, 10);

        await salvarContaRecorrente({
          tipo: 'parcela',
          nome: categoriaFinal,
          valor: valorPorParcela,
          diaVencimento,
          categoriaNome: categoriaFinal,
          cartaoId,
          quantidadeParcelas: numeroParcelas,
          mesInicio: dataIso,
        });
      } else if (podeVirarFixa && destino === 'fixa') {
        await salvarContaRecorrente({
          tipo: 'fixa',
          nome: categoriaFinal,
          valor: valorTotal,
          diaVencimento: parseInt(diaStr, 10),
          categoriaNome: categoriaFinal,
          cartaoId: null,
          quantidadeParcelas: null,
          mesInicio: dataIso,
        });
      } else {
        await salvarMovimentacao({
          tipo,
          valor: valorTotal,
          categoriaNome: categoriaFinal,
          data: dataIso,
          formaPagamento: forma,
          cartaoId: forma === 'debito' ? cartaoId : null,
        });
      }

      navigation.goBack();
    } catch (erro) {
      console.error('Erro ao salvar movimentação:', erro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <KeyboardAvoidingView style={styles.conteudoTotal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.botaoFechar}
          >
            <Ionicons name="close" size={24} color={cores.texto} />
          </TouchableOpacity>
          <Text style={[styles.headerTitulo, { color: cores.texto }]}>{tipo === 'entrada' ? 'Nova entrada' : 'Nova saída'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.dots}>
          {[1, 2, 3].map((n) => (
            <View
              key={n}
              style={[styles.dot, n <= passo ? { backgroundColor: cores.primario } : { backgroundColor: cores.borda }]}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          {passo === 1 && (
            <View>
              <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Valor</Text>
              <View style={styles.linhaValor}>
                <Text style={[styles.prefixoValor, { color: cores.textoSecundario }]}>R$</Text>
                <TextInput
                  style={[styles.inputValor, { color: cores.texto }]}
                  placeholder="0,00"
                  keyboardType="number-pad"
                  value={valor}
                  onChangeText={(texto) => setValor(formatarValorInput(texto))}
                />
              </View>
            </View>
          )}

          {passo === 2 && (
            <View>
              <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Categoria</Text>
              <View style={styles.grid}>
                {categorias.map((c) => {
                  const info = mapaCategorias[`${tipo}:${c}`];
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.catBotao, { borderColor: cores.borda }, categoria === c && { backgroundColor: cores.primario, borderColor: cores.primario }]}
                      onPress={() => setCategoria(c)}
                    >
                      {!!info && (
                        <Ionicons
                          name={info.icone}
                          size={14}
                          color={categoria === c ? '#fff' : info.cor}
                          style={{ marginRight: 6 }}
                        />
                      )}
                      <Text style={[styles.catTexto, { color: cores.texto }, categoria === c && styles.catTextoAtivo]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {categoria === 'Outros' && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario }]}>Nome da nova categoria</Text>
                  <TextInput
                    style={[styles.inputTexto, { borderColor: cores.borda, color: cores.texto }]}
                    placeholder="Ex: Pet, Cursos, Presentes..."
                    value={categoriaCustom}
                    onChangeText={setCategoriaCustom}
                  />
                </View>
              )}
            </View>
          )}

          {passo === 3 && (
            <View>
              <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Data e forma de pagamento</Text>
              <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario }]}>Data</Text>
              <CampoData
                valor={dataParaDate(data)}
                aoAlterar={(novaData) => setData(formatarData(novaData))}
                cores={cores}
                estilo={styles.seletorData}
              />

              <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario, marginTop: 14 }]}>Forma de pagamento</Text>
              <View style={styles.grid}>
                {FORMAS_PAGAMENTO.map((f) => (
                  <TouchableOpacity
                    key={f.chave}
                    style={[styles.formaBotao, { borderColor: cores.borda }, forma === f.chave && { backgroundColor: cores.primario, borderColor: cores.primario }]}
                    onPress={() => { setForma(f.chave); setDestino('gasto'); }}
                  >
                    <Ionicons
                      name={f.icone}
                      size={18}
                      color={forma === f.chave ? '#fff' : cores.texto}
                    />
                    <Text style={[styles.catTexto, { color: cores.texto }, forma === f.chave && styles.catTextoAtivo]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {podeVirarFixa && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario }]}>Adicionar como</Text>
                  <View style={styles.grid}>
                    <TouchableOpacity
                      style={[styles.formaBotao, { borderColor: cores.borda }, destino === 'gasto' && { backgroundColor: cores.primario, borderColor: cores.primario }]}
                      onPress={() => setDestino('gasto')}
                    >
                      <Ionicons name="wallet-outline" size={18} color={destino === 'gasto' ? '#fff' : cores.texto} />
                      <Text style={[styles.catTexto, { color: cores.texto }, destino === 'gasto' && styles.catTextoAtivo]}>Gasto avulso</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.formaBotao, { borderColor: cores.borda }, destino === 'fixa' && { backgroundColor: cores.primario, borderColor: cores.primario }]}
                      onPress={() => setDestino('fixa')}
                    >
                      <Ionicons name="repeat-outline" size={18} color={destino === 'fixa' ? '#fff' : cores.texto} />
                      <Text style={[styles.catTexto, { color: cores.texto }, destino === 'fixa' && styles.catTextoAtivo]}>Conta fixa</Text>
                    </TouchableOpacity>
                  </View>
                  {destino === 'fixa' && (
                    <Text style={[styles.avisoFixa, { color: cores.textoSecundario }]}>
                      Vai aparecer em Contas {'>'} Fixas todo mês, vencendo dia {data.split('/')[0]}.
                    </Text>
                  )}
                </View>
              )}

              {['debito', 'credito'].includes(forma) && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario }]}>Cartão usado</Text>
                  {cartoes.length === 0 ? (
                    <TouchableOpacity onPress={() => navigation.navigate('AdicionarCartao')}>
                      <Text style={[styles.linkCartao, { color: cores.primario }]}>Cadastre um cartão para continuar</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.cartaoLista}>
                      {cartoes.map((cartao, index) => (
                        <CardSelecionavel
                          key={cartao.id}
                          cartao={cartao}
                          cor={CORES_CARTAO[index % CORES_CARTAO.length]}
                          selecionado={cartaoId === cartao.id}
                          onPress={() => setCartaoId(cartao.id)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {ehCredito && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario }]}>Em quantas vezes?</Text>
                  <View style={styles.linhaParcelas}>
                    <TouchableOpacity
                      style={[styles.botaoParcela, { borderColor: cores.borda }]}
                      onPress={() => setParcelas(String(Math.max(1, (parseInt(parcelas, 10) || 1) - 1)))}
                    >
                      <Text style={[styles.botaoParcelaTexto, { color: cores.texto }]}>–</Text>
                    </TouchableOpacity>
                    <View style={styles.parcelasCentro}>
                      <Text style={[styles.parcelasNumero, { color: cores.texto }]}>{parcelas || '1'}x</Text>
                      {parseInt(parcelas, 10) > 1 && !!valor && (
                        <Text style={[styles.parcelasValor, { color: cores.textoSecundario }]}>
                          de R$ {(parseFloat(valor.replace(',', '.')) / parseInt(parcelas, 10)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.botaoParcela, { borderColor: cores.borda }]}
                      onPress={() => setParcelas(String(Math.min(24, (parseInt(parcelas, 10) || 1) + 1)))}
                    >
                      <Text style={[styles.botaoParcelaTexto, { color: cores.texto }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {forma && (
                <View style={[styles.resumo, { backgroundColor: cores.card }]}>
                  <Text style={[styles.resumoLabel, { color: cores.textoSecundario }]}>Resumo</Text>
                  <Text style={[styles.resumoTexto, { color: cores.texto }]}>
                    {podeVirarFixa && destino === 'fixa' ? 'Conta fixa' : (tipo === 'entrada' ? 'Entrada' : 'Saída')} de R${' '}
                    {valor || '0,00'} em {categoriaFinal || '—'}
                    {ehCredito ? `, em ${parcelas || 1}x` : ''}
                    {podeVirarFixa && destino === 'fixa' ? ', todo mês' : ''}.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.botoes}>
          {passo > 1 && (
            <TouchableOpacity style={[styles.botaoVoltar, { borderColor: cores.borda }]} onPress={() => setPasso(passo - 1)}>
              <Text style={[styles.botaoVoltarTexto, { color: cores.texto }]}>Voltar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.botaoAvancar, { backgroundColor: cores.primario }, (!podeAvancar() || salvando) && styles.botaoDesabilitado]}
            onPress={avancar}
            disabled={!podeAvancar() || salvando}
          >
            <Text style={styles.botaoAvancarTexto}>
              {salvando ? 'Salvando...' : passo === 3 ? (podeVirarFixa && destino === 'fixa' ? 'Salvar conta fixa' : 'Salvar movimentação') : 'Continuar'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  conteudoTotal: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 14,
  },
  botaoFechar: { paddingRight: 8, marginLeft: 4 },
  headerTitulo: { fontSize: 15, fontWeight: '500' },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  conteudo: { flexGrow: 1 },
  rotulo: { fontSize: 13, marginBottom: 12 },
  rotuloPequeno: { fontSize: 12, marginBottom: 6 },
  linhaValor: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefixoValor: { fontSize: 26 },
  inputValor: { fontSize: 26, fontWeight: '600', flex: 1, padding: 0 },
  inputTexto: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  seletorData: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dataTexto: { fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBotao: {
    width: '48%',
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTexto: { fontSize: 13 },
  catTextoAtivo: { color: '#fff' },
  formaBotao: {
    width: '48%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  linkCartao: { fontSize: 13, fontWeight: '500' },
  avisoFixa: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  cartaoLista: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cartaoCard: {
    width: '47%',
    height: 100,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between',
  },
  cartaoCardSelecionado: {
    borderWidth: 2,
    borderColor: '#0F766E',
  },
  cartaoCardTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartaoCardBandeira: { fontSize: 12, color: '#fff', fontWeight: '600' },
  cartaoCardNumero: { color: 'rgba(255,255,255,0.9)', fontSize: 12, letterSpacing: 0.6 },
  cartaoCardNome: { fontSize: 13, color: '#fff', fontWeight: '600' },
  cartaoCardCheck: { position: 'absolute', top: 8, right: 8 },
  linhaParcelas: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botaoParcela: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoParcelaTexto: { fontSize: 18 },
  parcelasCentro: { flex: 1, alignItems: 'center' },
  parcelasNumero: { fontSize: 20, fontWeight: '600' },
  parcelasValor: { fontSize: 12, marginTop: 2 },
  resumo: { borderRadius: 12, padding: 14, marginTop: 16 },
  resumoLabel: { fontSize: 12, marginBottom: 4 },
  resumoTexto: { fontSize: 14, lineHeight: 20 },
  botoes: { flexDirection: 'row', gap: 8, paddingTop: 12 },
  botaoVoltar: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoVoltarTexto: { fontSize: 14, fontWeight: '500' },
  botaoAvancar: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoDesabilitado: { backgroundColor: '#B7D3D0' },
  botaoAvancarTexto: { fontSize: 14, fontWeight: '600', color: '#fff' },
});