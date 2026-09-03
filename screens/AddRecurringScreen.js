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
import { salvarContaRecorrente, getCartoes } from '../database/queries';
import { useTema } from '../context/ThemeContext';

const TIPOS = [
  { chave: 'fixa', label: 'Conta fixa', descricao: 'aluguel, energia, internet...', icone: 'home-outline' },
  { chave: 'parcela', label: 'Parcela', descricao: 'compra parcelada com fim previsto', icone: 'card-outline' },
  { chave: 'assinatura', label: 'Assinatura', descricao: 'streaming, apps, clube...', icone: 'refresh-outline' },
];

// Transforma o texto digitado (só dígitos importam) num valor formatado
// como "940,22" — os dois últimos dígitos sempre viram os centavos.
function formatarValorInput(texto) {
  const somenteDigitos = texto.replace(/\D/g, '');
  if (!somenteDigitos) return '';
  const numero = parseInt(somenteDigitos, 10) / 100;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AddRecurringScreen({ navigation, route }) {
  const { cores } = useTema();
  const tipoInicial = route.params?.tipoInicial || null;
  const [passo, setPasso] = useState(tipoInicial ? 2 : 1);
  const [tipo, setTipo] = useState(tipoInicial);
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [cartoes, setCartoes] = useState([]);
  const [cartaoId, setCartaoId] = useState(route.params?.cartaoId || null);
  useEffect(() => { getCartoes().then(setCartoes); }, []);

  function podeAvancar() {
    if (passo === 1) return !!tipo;
    if (passo === 2) {
      return (
        !!nome.trim() &&
        !!valor &&
        parseFloat(valor.replace(',', '.')) > 0 &&
        (tipo === 'parcela' || (!!diaVencimento && parseInt(diaVencimento, 10) >= 1 && parseInt(diaVencimento, 10) <= 31)) &&
        (tipo === 'fixa' || !!cartaoId) &&
        (tipo !== 'parcela' || (parseInt(quantidadeParcelas, 10) >= 1))
      );
    }
    return true;
  }

  async function avancar() {
    if (passo < 3) {
      setPasso(passo + 1);
      return;
    }

    setSalvando(true);
    try {
      await salvarContaRecorrente({
        tipo,
        nome: nome.trim(),
        valor: parseFloat(valor.replace(',', '.')),
        diaVencimento: tipo === 'parcela' ? 1 : parseInt(diaVencimento, 10),
        categoriaNome: nome.trim(),
        cartaoId,
        quantidadeParcelas: tipo === 'parcela' ? parseInt(quantidadeParcelas, 10) : null,
      });
      navigation.goBack();
    } catch (erro) {
      console.error('Erro ao salvar conta recorrente:', erro);
    } finally {
      setSalvando(false);
    }
  }

  const tipoLabel = TIPOS.find((t) => t.chave === tipo)?.label;

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
          <Text style={[styles.headerTitulo, { color: cores.texto }]}>Nova conta recorrente</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.dots}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={[styles.dot, n <= passo ? { backgroundColor: cores.primario } : { backgroundColor: cores.borda }]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          {passo === 1 && (
            <View>
              <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Tipo de conta recorrente</Text>
              {TIPOS.map((t) => (
                <TouchableOpacity
                  key={t.chave}
                  style={[styles.tipoBotao, { borderColor: cores.borda }, tipo === t.chave && { backgroundColor: cores.primario, borderColor: cores.primario }]}
                  onPress={() => setTipo(t.chave)}
                >
                  <Ionicons name={t.icone} size={18} color={tipo === t.chave ? '#fff' : cores.primario} />
                  <View>
                    <Text style={[styles.tipoLabel, { color: cores.texto }, tipo === t.chave && { color: '#fff' }]}>{t.label}</Text>
                    <Text style={[styles.tipoDescricao, { color: cores.textoSecundario }, tipo === t.chave && { color: '#CCFBF1' }]}>{t.descricao}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {passo === 2 && (
            <View>
              <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Detalhes</Text>

              <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario }]}>Nome</Text>
              <TextInput
                style={[styles.inputTexto, { borderColor: cores.borda, color: cores.texto }]}
                placeholder="Ex: Aluguel"
                value={nome}
                onChangeText={setNome}
              />

              <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario, marginTop: 14 }]}>Valor</Text>
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

              {tipo !== 'parcela' && <><Text style={[styles.rotuloPequeno, { color: cores.textoSecundario, marginTop: 14 }]}>Dia de vencimento</Text><TextInput style={[styles.inputTexto, { borderColor: cores.borda, color: cores.texto }]} placeholder="Ex: 10" keyboardType="number-pad" value={diaVencimento} onChangeText={setDiaVencimento} maxLength={2} /></>}
              {tipo === 'parcela' && <><Text style={[styles.rotuloPequeno, { color: cores.textoSecundario, marginTop: 14 }]}>Quantidade de parcelas</Text><TextInput style={[styles.inputTexto, { borderColor: cores.borda, color: cores.texto }]} placeholder="Ex: 12" keyboardType="number-pad" value={quantidadeParcelas} onChangeText={setQuantidadeParcelas} maxLength={2} /></>}
              {tipo !== 'fixa' && <View><Text style={[styles.rotuloPequeno, { color: cores.textoSecundario, marginTop: 14 }]}>Cartão</Text>{cartoes.length === 0 ? <TouchableOpacity onPress={() => navigation.navigate('AdicionarCartao')}><Text style={[styles.linkCartao, { color: cores.primario }]}>Cadastre um cartão para continuar</Text></TouchableOpacity> : cartoes.map((cartao) => <TouchableOpacity key={cartao.id} onPress={() => setCartaoId(cartao.id)} style={[styles.cartaoBotao, { borderColor: cores.borda }, cartaoId === cartao.id && { backgroundColor: cores.primario, borderColor: cores.primario }]}><Text style={[styles.cartaoTexto, { color: cores.texto }, cartaoId === cartao.id && styles.cartaoTextoAtivo]}>{cartao.apelido}{cartao.ultimos_digitos ? ` •••• ${cartao.ultimos_digitos}` : ''}</Text></TouchableOpacity>)}</View>}
            </View>
          )}

          {passo === 3 && (
            <View>
              <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Confirmar</Text>
              <View style={[styles.resumo, { backgroundColor: cores.card }]}>
                <Text style={[styles.resumoTexto, { color: cores.texto }]}>{tipoLabel}: {nome}</Text>
                <Text style={[styles.resumoTexto, { color: cores.texto }]}>
                  Valor: R$ {valor || '0,00'}
                </Text>
                {tipo !== 'parcela' && <Text style={[styles.resumoTexto, { color: cores.texto }]}>Vencimento: dia {diaVencimento}</Text>}
                {tipo === 'parcela' && <Text style={[styles.resumoTexto, { color: cores.texto }]}>Parcelas: {quantidadeParcelas}x</Text>}
              </View>
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
              {salvando ? 'Salvando...' : passo === 3 ? 'Salvar conta' : 'Continuar'}
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
  tipoBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  tipoLabel: { fontSize: 14, fontWeight: '500' },
  tipoDescricao: { fontSize: 12 },
  inputTexto: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  linhaValor: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefixoValor: { fontSize: 20 },
  inputValor: { fontSize: 20, fontWeight: '600', flex: 1, padding: 0 },
  resumo: { borderRadius: 12, padding: 14 },
  resumoTexto: { fontSize: 14, lineHeight: 22 },
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
  cartaoBotao: { height: 42, borderWidth: 1, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 12, marginBottom: 8 },
  cartaoTexto: { fontSize: 13 },
  cartaoTextoAtivo: { color: '#fff' },
  linkCartao: { fontSize: 13, fontWeight: '500' },
});