import React, { useState, useCallback } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getResumoCartoes } from '../database/queries';
import { useMes } from '../context/MonthContext';
import { useTema } from '../context/ThemeContext';
import WebPageHeader from '../components/WebPageHeader';
import PageIntro from '../components/PageIntro';
const real=(v)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const CORES_CARTAO = ['#1C1C1E', '#284B63', '#6B3E26', '#3F3B75'];
export default function CardsScreen({ navigation }) {
 const { referencia } = useMes();
 const { cores } = useTema();
 const { width } = useWindowDimensions();
 const web = Platform.OS === 'web' && width >= 768;
 const [cartoes,setCartoes]=useState(null);
 useFocusEffect(useCallback(()=>{let ativo=true; getResumoCartoes(referencia).then(r=>ativo&&setCartoes(r)); return()=>{ativo=false};},[referencia]));
 if(!cartoes)return <SafeAreaView style={[styles.centro,{backgroundColor:cores.fundo}]}><ActivityIndicator size="large" color={cores.primario}/></SafeAreaView>;
 if (web) return <CardsWeb cartoes={cartoes} cores={cores} navigation={navigation} />;
 const totalCartoes=cartoes.reduce((soma,cartao)=>soma+cartao.total,0);
 return <SafeAreaView style={[styles.container,{backgroundColor:cores.fundo}]}><View style={styles.header}><TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="arrow-back" size={22} color={cores.texto}/></TouchableOpacity><Text style={[styles.titulo,{color:cores.texto}]}>Cartões</Text><View style={{width:22}}/></View><ScrollView contentContainerStyle={styles.scroll}><View style={styles.resumo}><Text style={[styles.resumoLabel,{color:cores.textoSecundario}]}>Comprometido em cartões</Text><Text style={[styles.resumoValor,{color:cores.texto}]}>{real(totalCartoes)}</Text></View>{cartoes.length===0?<View style={styles.vazio}><Ionicons name="card-outline" size={36} color={cores.textoSecundario}/><Text style={[styles.vazioTitulo,{color:cores.texto}]}>Adicione seu primeiro cartão</Text><Text style={[styles.vazioTexto,{color:cores.textoSecundario}]}>Acompanhe parcelas, assinaturas e compras em um só lugar.</Text></View>:<View style={styles.pilha}>{cartoes.map((cartao,index)=><TouchableOpacity key={cartao.id} style={[styles.card,{backgroundColor:CORES_CARTAO[index%CORES_CARTAO.length],marginTop:index===0?0:-42,zIndex:cartoes.length-index}]} activeOpacity={0.86} onPress={()=>navigation.navigate('DetalhesCartao',{cartao})}><View style={styles.cardTopo}><Text style={styles.bandeira}>{cartao.bandeira}</Text><Ionicons name="card" size={25} color="rgba(255,255,255,0.85)"/></View><Text style={styles.numero}>{cartao.ultimos_digitos?`••••  ••••  ••••  ${cartao.ultimos_digitos}`:'••••  ••••  ••••  ••••'}</Text><View style={styles.cardRodape}><View><Text style={styles.cardLabel}>CARTÃO</Text><Text style={styles.nome}>{cartao.apelido}</Text></View><View style={styles.valorBloco}><Text style={styles.cardLabel}>NESTE MÊS</Text><Text style={styles.valor}>{real(cartao.total)}</Text></View></View></TouchableOpacity>)}</View>}</ScrollView><TouchableOpacity style={[styles.fab,{backgroundColor:cores.primario}]} onPress={()=>navigation.navigate('AdicionarCartao')}><Ionicons name="add" size={19} color="#fff"/><Text style={styles.fabTexto}>Adicionar cartão</Text></TouchableOpacity></SafeAreaView>;
}

function CardsWeb({ cartoes, cores, navigation }) {
  return (
    <SafeAreaView style={[webStyles.container, { backgroundColor: cores.fundo }]}>
      <ScrollView contentContainerStyle={webStyles.scrollContent}>
        <WebPageHeader acaoTexto="Novo lançamento" aoAcionar={() => navigation.navigate('AdicionarMovimentacao')} />
        <PageIntro kicker="LIMITES E FATURAS" titulo="Cartões" subtitulo="Abra um cartão para conferir todas as contas da fatura." cores={cores} />

        {cartoes.length === 0 ? (
          <View style={[webStyles.vazio, { backgroundColor: cores.card }]}>
            <Ionicons name="card-outline" size={30} color={cores.textoSecundario} />
            <Text style={[webStyles.vazioTitulo, { color: cores.texto }]}>Adicione seu primeiro cartão</Text>
            <Text style={[webStyles.vazioTexto, { color: cores.textoSecundario }]}>
              Acompanhe parcelas, assinaturas e compras em um só lugar.
            </Text>
            <TouchableOpacity style={[webStyles.botaoNovo, { backgroundColor: cores.primario }]} onPress={() => navigation.navigate('AdicionarCartao')}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={webStyles.botaoNovoTexto}>Adicionar cartão</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={webStyles.grid}>
              {cartoes.map((cartao, index) => (
                <TouchableOpacity
                  key={cartao.id}
                  style={[webStyles.card, { backgroundColor: CORES_CARTAO[index % CORES_CARTAO.length] }]}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('DetalhesCartao', { cartao })}
                >
                  <View style={webStyles.cardTopo}>
                    <Text style={webStyles.bandeira}>{cartao.bandeira}</Text>
                    <Ionicons name="card" size={22} color="rgba(255,255,255,0.85)" />
                  </View>
                  <Text style={webStyles.nome}>{cartao.apelido}</Text>
                  <Text style={webStyles.numero}>
                    {cartao.ultimos_digitos ? `•••• ${cartao.ultimos_digitos}` : '•••• ••••'}
                  </Text>
                  <View style={webStyles.cardRodape}>
                    <View>
                      <Text style={webStyles.cardLabel}>FATURA ATUAL</Text>
                      <Text style={webStyles.valor}>{real(cartao.total)}</Text>
                    </View>
                    <View style={webStyles.abrirFaturaLinha}>
                      <Text style={webStyles.abrirFaturaTexto}>Abrir fatura</Text>
                      <Ionicons name="arrow-forward" size={13} color="#5EEAD4" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[webStyles.avisoCard, { backgroundColor: cores.card }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={cores.primario} />
              <Text style={[webStyles.avisoTexto, { color: cores.textoSecundario }]}>
                Os cartões exibem apenas os dados necessários para organizar limites e vencimentos.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const webStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 60, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  card: { width: 280, height: 175, borderRadius: 20, padding: 22, justifyContent: 'space-between' },
  cardTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bandeira: { fontSize: 11, color: '#5EEAD4', fontWeight: '700', letterSpacing: 1 },
  nome: { fontSize: 18, color: '#fff', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginTop: -8 },
  numero: { color: 'rgba(255,255,255,0.6)', fontSize: 14, letterSpacing: 1.5, marginTop: 2 },
  cardRodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardLabel: { fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.7, marginBottom: 3 },
  valor: { fontSize: 16, fontWeight: '700', color: '#fff' },
  abrirFaturaLinha: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  abrirFaturaTexto: { fontSize: 12, fontWeight: '600', color: '#5EEAD4' },
  avisoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 16, marginTop: 20 },
  avisoTexto: { fontSize: 12, flex: 1 },
  vazio: { alignItems: 'center', padding: 50, borderRadius: 20 },
  vazioTitulo: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  vazioTexto: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 6, maxWidth: 320 },
  botaoNovo: { flexDirection: 'row', gap: 6, alignItems: 'center', height: 42, borderRadius: 10, paddingHorizontal: 18, marginTop: 18 },
  botaoNovoTexto: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

const styles=StyleSheet.create({container:{flex:1},centro:{flex:1,alignItems:'center',justifyContent:'center'},header:{padding:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},titulo:{fontSize:16,fontWeight:'600'},scroll:{padding:16,paddingTop:0,paddingBottom:95},resumo:{marginBottom:20},resumoLabel:{fontSize:13},resumoValor:{fontSize:26,fontWeight:'700',marginTop:2},pilha:{paddingBottom:42},card:{height:188,borderRadius:20,padding:20,shadowColor:'#000',shadowOffset:{width:0,height:5},shadowOpacity:0.18,shadowRadius:10,elevation:5},cardTopo:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},bandeira:{fontSize:15,color:'#fff',fontWeight:'600'},numero:{color:'rgba(255,255,255,0.92)',fontSize:17,letterSpacing:1.2,marginTop:35},cardRodape:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',marginTop:20},cardLabel:{fontSize:9,color:'rgba(255,255,255,0.65)',letterSpacing:0.7},nome:{fontSize:15,color:'#fff',fontWeight:'600',marginTop:3},valorBloco:{alignItems:'flex-end'},valor:{fontSize:14,fontWeight:'600',color:'#fff',marginTop:3},vazio:{alignItems:'center',paddingTop:65,paddingHorizontal:30},vazioTitulo:{fontSize:16,fontWeight:'600',marginTop:12},vazioTexto:{fontSize:13,textAlign:'center',lineHeight:19,marginTop:6},fab:{position:'absolute',bottom:24,left:16,right:16,height:50,borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},fabTexto:{color:'#fff',fontSize:15,fontWeight:'600'}});