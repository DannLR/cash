import React, { useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, Switch, ActivityIndicator, Platform, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getNotificacoesAtivas, definirNotificacoesAtivas } from '../database/queries';
import { reagendarLembretes } from '../utils/notifications';
import { useTema } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { sincronizarAgora } from '../services/sync';
import { abrirConfiguracaoNotificacoesCompra, temAcessoNotificacoesCompra, obterComprasPendentes } from '../services/androidPurchaseCapture';

export default function SettingsScreen({ navigation }) {
  const { modoEscuro, alternarTema, cores } = useTema();
  const { usuario, sair } = useAuth();
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [acessoCompras, setAcessoCompras] = useState(false);
  const [comprasPendentes, setComprasPendentes] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      getNotificacoesAtivas().then((v) => ativo && setNotificacoesAtivas(v));
      if (Platform.OS === 'android') {
        const atualizarAcesso = () => temAcessoNotificacoesCompra()
          .then((v) => ativo && setAcessoCompras(v))
          .catch(() => ativo && setAcessoCompras(false));
        const atualizarPendentes = () => ativo && setComprasPendentes(obterComprasPendentes().length);
        atualizarAcesso();
        atualizarPendentes();
        const inscricao = AppState.addEventListener('change', (estado) => {
          if (estado === 'active') {
            atualizarAcesso();
            atualizarPendentes();
          }
        });
        return () => {
          ativo = false;
          inscricao.remove();
        };
      }
      return () => { ativo = false; };
    }, [])
  );

  async function alternarNotificacoes(valor) {
    setNotificacoesAtivas(valor);
    await definirNotificacoesAtivas(valor);
    reagendarLembretes(); // agenda de novo ou cancela tudo, conforme o novo valor
  }

  async function encerrarSessao() {
    setSaindo(true);
    try {
      if (usuario?.id) await sincronizarAgora(usuario.id);
      await sair();
    } catch (erro) {
      console.warn('A sessão será encerrada; os dados locais continuarão aguardando sincronização:', erro.message);
      await sair();
    } finally {
      setSaindo(false);
    }
  }

  function revisarProximaCompra() {
    const compra = obterComprasPendentes()[0];
    if (compra?.id) navigation.navigate('RevisarCompra', { purchaseId: compra.id });
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
        <Text style={[styles.secaoTitulo, { color: cores.textoSecundario }]}>Conta</Text>
        <View style={[styles.card, { backgroundColor: cores.card }]}>
          <View style={styles.linha}>
            <View style={styles.linhaEsquerda}>
              <Ionicons name="person-circle-outline" size={20} color={cores.primario} />
              <Text style={[styles.linhaTexto, { color: cores.texto }]}>{usuario?.email || 'Usuário'}</Text>
            </View>
            <TouchableOpacity onPress={encerrarSessao} disabled={saindo} accessibilityLabel="Sair da conta">
              {saindo ? <ActivityIndicator color={cores.primario} /> : <Ionicons name="log-out-outline" size={20} color={cores.primario} />}
            </TouchableOpacity>
          </View>
        </View>

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

        {Platform.OS === 'android' && (
          <>
            <Text style={[styles.secaoTitulo, { color: cores.textoSecundario, marginTop: 20 }]}>Compras automáticas</Text>
            <View style={[styles.card, { backgroundColor: cores.card }]}>
              <View style={styles.linha}>
                <View style={styles.linhaEsquerda}>
                  <Ionicons name="card-outline" size={18} color={cores.primario} />
                  <Text style={[styles.linhaTexto, { color: cores.texto }]}>
                    {acessoCompras ? 'Acesso às notificações ativo' : 'Detectar compras por notificação'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={abrirConfiguracaoNotificacoesCompra}
                  accessibilityLabel="Configurar acesso às notificações de compra"
                  style={[styles.botaoPermissao, { borderColor: cores.primario }]}
                >
                  <Text style={{ color: cores.primario, fontSize: 12, fontWeight: '600' }}>Configurar</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.linhaAjuda, { color: cores.textoSecundario }]}>
                O Android exige acesso geral às notificações para detectar compras de bancos e do Google Pay. O Cash analisa o conteúdo no aparelho e guarda temporariamente apenas avisos que parecem compras. Ao tocar no aviso do Cash, você pode editar valor, categoria, data e forma de pagamento; só então o lançamento é salvo e sincronizado.
              </Text>
              {comprasPendentes > 0 && (
                <TouchableOpacity onPress={revisarProximaCompra} style={[styles.botaoRevisar, { backgroundColor: cores.fundo }]}>
                  <Ionicons name="create-outline" size={16} color={cores.primario} />
                  <Text style={{ color: cores.primario, fontSize: 12, fontWeight: '600' }}>
                    Revisar compra pendente ({comprasPendentes})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

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
  botaoPermissao: { borderWidth: 1, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 11 },
  botaoRevisar: { minHeight: 40, borderRadius: 10, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
});
