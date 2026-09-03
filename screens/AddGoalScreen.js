import React, { useState } from 'react';
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
import { salvarMeta } from '../database/queries';
import { useTema } from '../context/ThemeContext';

const ATALHOS = [
  { icone: 'home-outline', nome: 'Entrada de apartamento' },
  { icone: 'car-outline', nome: 'Carro' },
  { icone: 'airplane-outline', nome: 'Viagem' },
  { icone: 'umbrella-outline', nome: 'Reserva de emergência' },
  { icone: 'flag-outline', nome: '' },
];

function formatarValorInput(texto) {
  const somenteDigitos = texto.replace(/\D/g, '');
  if (!somenteDigitos) return '';
  const numero = parseInt(somenteDigitos, 10) / 100;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function paraNumero(texto) {
  return parseFloat((texto || '0').replace(/\./g, '').replace(',', '.')) || 0;
}

export default function AddGoalScreen({ navigation }) {
  const { cores } = useTema();
  const [passo, setPasso] = useState(1);
  const [icone, setIcone] = useState(null);
  const [nome, setNome] = useState('');
  const [valorObjetivo, setValorObjetivo] = useState('');
  const [valorGuardado, setValorGuardado] = useState('');
  const [aporteMensal, setAporteMensal] = useState('');
  const [salvando, setSalvando] = useState(false);

  function podeAvancar() {
    if (passo === 1) return !!icone && !!nome.trim();
    if (passo === 2) return !!valorObjetivo && paraNumero(valorObjetivo) > 0;
    if (passo === 3) return true;
    if (passo === 4) return !!aporteMensal && paraNumero(aporteMensal) > 0;
    return false;
  }

  async function avancar() {
    if (passo < 4) {
      setPasso(passo + 1);
      return;
    }
    setSalvando(true);
    try {
      await salvarMeta({
        nome: nome.trim(),
        icone,
        valorObjetivo: paraNumero(valorObjetivo),
        valorGuardado: paraNumero(valorGuardado),
        aporteMensal: paraNumero(aporteMensal),
      });
      navigation.goBack();
    } finally {
      setSalvando(false);
    }
  }

  const restante = Math.max(paraNumero(valorObjetivo) - paraNumero(valorGuardado), 0);
  const aporteNum = paraNumero(aporteMensal);
  const previsaoMeses = aporteNum > 0 ? Math.ceil(restante / aporteNum) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <KeyboardAvoidingView style={styles.conteudoTotal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color={cores.texto} />
          </TouchableOpacity>
          <Text style={[styles.headerTitulo, { color: cores.texto }]}>Nova meta</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.dots}>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={[styles.dot, n <= passo ? { backgroundColor: cores.primario } : { backgroundColor: cores.borda }]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          {passo === 1 && (
            <View>
              <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Qual é a meta?</Text>
              <View style={styles.grid}>
                {ATALHOS.map((a) => (
                  <TouchableOpacity
                    key={a.icone}
                    style={[styles.atalhoBotao, { borderColor: cores.borda }, icone === a.icone && { backgroundColor: cores.primario, borderColor: cores.primario }]}
                    onPress={() => {
                      setIcone(a.icone);
                      if (a.nome) setNome(a.nome);
                    }}
                  >
                    <Ionicons name={a.icone} size={18} color={icone === a.icone ? '#fff' : cores.texto} />
                    <Text style={[styles.atalhoTexto, { color: icone === a.icone ? '#fff' : cores.texto }]}>
                      {a.nome || 'Outro'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.rotuloPequeno, { color: cores.textoSecundario, marginTop: 14 }]}>Nome da meta</Text>
              <TextInput
                style={[styles.inputTexto, { borderColor: cores.borda, color: cores.texto }]}
                placeholder="Ex: Entrada de apartamento"
                value={nome}
                onChangeText={setNome}
              />
            </View>
          )}

          {passo === 2 && (
            <View>
              <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Valor objetivo</Text>
              <View style={styles.linhaValor}>
                <Text style={[styles.prefixoValor, { color: cores.textoSecundario }]}>R$</Text>
                <TextInput
                  style={[styles.inputValor, { color: cores.texto }]}
                  placeholder="0,00"
                  keyboardType="number-pad"
                  value={valorObjetivo}
                  onChangeText={(t) => setValorObjetivo(formatarValorInput(t))}
                />
              </View>
            </View>
          )}

          {passo === 3 && (
            <View>
              <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Você já tem algo guardado?</Text>
              <View style={styles.linhaValor}>
                <Text style={[styles.prefixoValor, { color: cores.textoSecundario }]}>R$</Text>
                <TextInput
                  style={[styles.inputValor, { color: cores.texto }]}
                  placeholder="0,00 (opcional)"
                  keyboardType="number-pad"
                  value={valorGuardado}
                  onChangeText={(t) => setValorGuardado(formatarValorInput(t))}
                />
              </View>
            </View>
          )}

          {passo === 4 && (
            <View>
              <Text style={[styles.rotulo, { color: cores.textoSecundario }]}>Quanto pretende guardar por mês?</Text>
              <View style={styles.linhaValor}>
                <Text style={[styles.prefixoValor, { color: cores.textoSecundario }]}>R$</Text>
                <TextInput
                  style={[styles.inputValor, { color: cores.texto }]}
                  placeholder="0,00"
                  keyboardType="number-pad"
                  value={aporteMensal}
                  onChangeText={(t) => setAporteMensal(formatarValorInput(t))}
                />
              </View>
              <View style={[styles.resumo, { backgroundColor: cores.card }]}>
                <Text style={[styles.resumoLabel, { color: cores.textoSecundario }]}>Previsão</Text>
                <Text style={[styles.resumoTexto, { color: cores.texto }]}>
                  {previsaoMeses !== null
                    ? `Mantendo esse ritmo, você atinge a meta em aproximadamente ${previsaoMeses} ${previsaoMeses === 1 ? 'mês' : 'meses'}.`
                    : 'Informe o aporte mensal para ver a previsão.'}
                </Text>
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
              {salvando ? 'Salvando...' : passo === 4 ? 'Criar meta' : 'Continuar'}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 14 },
  headerTitulo: { fontSize: 15, fontWeight: '500' },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  conteudo: { flexGrow: 1 },
  rotulo: { fontSize: 13, marginBottom: 12 },
  rotuloPequeno: { fontSize: 12, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  atalhoBotao: {
    width: '47%',
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  atalhoTexto: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  inputTexto: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 14 },
  linhaValor: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prefixoValor: { fontSize: 26 },
  inputValor: { fontSize: 26, fontWeight: '600', flex: 1, padding: 0 },
  resumo: { borderRadius: 12, padding: 14, marginTop: 16 },
  resumoLabel: { fontSize: 12, marginBottom: 6 },
  resumoTexto: { fontSize: 14, lineHeight: 20 },
  botoes: { flexDirection: 'row', gap: 8, paddingTop: 12 },
  botaoVoltar: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  botaoVoltarTexto: { fontSize: 14, fontWeight: '500' },
  botaoAvancar: { flex: 2, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  botaoDesabilitado: { opacity: 0.5 },
  botaoAvancarTexto: { fontSize: 14, fontWeight: '600', color: '#fff' },
});