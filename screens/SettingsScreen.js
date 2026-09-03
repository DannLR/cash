import React, { useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getNotificacoesAtivas, definirNotificacoesAtivas } from '../database/queries';
import { reagendarLembretes } from '../utils/notifications';
import { useTema } from '../context/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { modoEscuro, alternarTema, cores } = useTema();
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      getNotificacoesAtivas().then((v) => ativo && setNotificacoesAtivas(v));
      return () => { ativo = false; };
    }, [])
  );

  async function alternarNotificacoes(valor) {
    setNotificacoesAtivas(valor);
    await definirNotificacoesAtivas(valor);
    reagendarLembretes(); // agenda de novo ou cancela tudo, conforme o novo valor
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cores.fundo }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={cores.texto} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: cores.texto }]}>Configurações</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.secaoTitulo, { color: cores.textoSecundario }]}>Aparência</Text>
        <View style={[styles.card, { backgroundColor: cores.card }]}>
          <View style={styles.linha}>
            <View style={styles.linhaEsquerda}>
              <Ionicons name={modoEscuro ? 'moon' : 'sunny'} size={18} color={cores.primario} />
              <Text style={[styles.linhaTexto, { color: cores.texto }]}>Modo escuro</Text>
            </View>
            <Switch value={modoEscuro} onValueChange={alternarTema} trackColor={{ true: cores.primario }} />
          </View>
        </View>

        <Text style={[styles.secaoTitulo, { color: cores.textoSecundario, marginTop: 20 }]}>Notificações</Text>
        <View style={[styles.card, { backgroundColor: cores.card }]}>
          <View style={styles.linha}>
            <View style={styles.linhaEsquerda}>
              <Ionicons name="notifications-outline" size={18} color={cores.primario} />
              <Text style={[styles.linhaTexto, { color: cores.texto }]}>Lembretes de vencimento</Text>
            </View>
            <Switch value={notificacoesAtivas} onValueChange={alternarNotificacoes} trackColor={{ true: cores.primario }} />
          </View>
          <Text style={[styles.linhaAjuda, { color: cores.textoSecundario }]}>
            Avisa às 9h no dia de vencimento de cada conta fixa, parcela ou assinatura ativa.
          </Text>
        </View>

        <Text style={[styles.secaoTitulo, { color: cores.textoSecundario, marginTop: 20 }]}>Sobre</Text>
        <View style={[styles.card, { backgroundColor: cores.card }]}>
          <Text style={[styles.linhaTexto, { color: cores.texto }]}>cash</Text>
          <Text style={[styles.linhaAjuda, { color: cores.textoSecundario, marginTop: 2 }]}>Versão 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 16, fontWeight: '600' },
  scroll: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  secaoTitulo: { fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 12, padding: 14 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linhaEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linhaTexto: { fontSize: 14, fontWeight: '500' },
  linhaAjuda: { fontSize: 12, marginTop: 8, lineHeight: 17 },
});