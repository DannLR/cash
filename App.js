import React, { useState, useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTema } from './context/ThemeContext';
import { MonthProvider } from './context/MonthContext';
import { useWindowDimensions } from 'react-native';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Platform,
  AppState,
} from 'react-native';

import HomeScreen from './screens/HomeScreen';
import PlanningScreen from './screens/PlanningScreen';
import ContasScreen from './screens/ContasScreen';
import InsightsScreen from './screens/InsightsScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import AddRecurringScreen from './screens/AddRecurringScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import EditListScreen from './screens/EditListScreen';
import MonthPickerScreen from './screens/MonthPickerScreen';
import CardsScreen from './screens/CardsScreen';
import CardDetailsScreen from './screens/CardDetailsScreen';
import AddCardScreen from './screens/AddCardScreen';
import EditCardScreen from './screens/EditCardScreen';
import GoalsScreen from './screens/GoalsScreen';
import AddGoalScreen from './screens/AddGoalScreen';
import GoalDetailScreen from './screens/GoalDetailScreen';
import SettingsScreen from './screens/SettingsScreen';
import SubscriptionsScreen from './screens/SubscriptionsScreen';
import AuthScreen from './screens/AuthScreen';
import ReviewPurchaseScreen from './screens/ReviewPurchaseScreen';
import ReceiptScreen from './screens/ReceiptScreen';

import { getDb, setUsuarioAtual } from './database/db';
import { getOnboardingVisto, marcarOnboardingVisto } from './database/queries';
import LoadingScreen from './components/LoadingScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { reagendarLembretes } from './utils/notifications';
import { AuthProvider, useAuth } from './context/AuthContext';
import { iniciarSincronizacao } from './services/sync';
import { obterNotificacaoSelecionada } from './services/androidPurchaseCapture';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const CardsStack = createNativeStackNavigator();

// Carrega as mesmas fontes que o site original usava (Space Grotesk pros
// títulos, DM Sans pro corpo do texto) e aplica como fonte padrão — só na
// web, pra não mexer na aparência do app nativo (que usa a fonte do sistema).
if (Platform.OS === 'web') {
  document.documentElement.lang = 'pt-BR';
  const linkExistente = document.getElementById('fontes-cash');
  if (!linkExistente) {
    const link = document.createElement('link');
    link.id = 'fontes-cash';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.style = [{ fontFamily: 'DM Sans, sans-serif' }, Text.defaultProps.style];
}

// Referência de navegação — permite navegar a partir de fora da árvore
// de telas, como o botão dentro do menu do modal "+" abaixo.
export const navigationRef = createNavigationContainerRef();

function TelaVazia() {
  return <View />;
}

function BotaoAdicionar({ onPress, web }) {
  if (web) {
    return (
      <TouchableOpacity style={styles.botaoAdicionarWeb} onPress={onPress} activeOpacity={0.85} accessibilityLabel="Adicionar lançamento">
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.botaoAdicionarWebTexto}>Adicionar</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={styles.fabWrapper} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.fab}>
        <Ionicons name="add" size={26} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const ICONES_ABAS = {
  Início: 'home-outline',
  Planejamento: 'calendar-outline',
  Contas: 'repeat-outline',
  Cartões: 'card-outline',
  Insights: 'stats-chart-outline',
};

function SiteTabBar({ state, descriptors, navigation }) {
  const { width } = useWindowDimensions();
  const [hoveredRoute, setHoveredRoute] = useState(null);

  return (
    <View style={styles.siteTabBarWeb}>
      <View style={styles.siteTabBarPill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if (options.tabBarButton) {
            return <View key={route.key} style={styles.siteAddSlot}>{options.tabBarButton({})}</View>;
          }

          const focado = state.index === index;
          const icone = ICONES_ABAS[route.name];
          const aoPressionar = () => {
            const evento = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focado && !evento.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={aoPressionar}
              onMouseEnter={() => setHoveredRoute(route.key)}
              onMouseLeave={() => setHoveredRoute(null)}
              onHoverIn={() => setHoveredRoute(route.key)}
              onHoverOut={() => setHoveredRoute(null)}
              activeOpacity={0.7}
              accessibilityLabel={route.name}
              title={route.name}
              style={[styles.siteTabItem, focado && styles.siteTabItemAtivo, hoveredRoute === route.key && styles.siteTabItemHover]}
            >
              {icone && (
                <>
                  <Ionicons
                    name={icone}
                    size={17}
                    color={focado || hoveredRoute === route.key ? '#553584' : '#D1CBD8'}
                    style={hoveredRoute === route.key && styles.siteTabIconHover}
                  />
                  <Text numberOfLines={1} style={[styles.siteTabLabel, width < 520 && styles.siteTabLabelCompact, (focado || hoveredRoute === route.key) && styles.siteTabLabelAtivo]}>{width < 520 ? ({ Planejamento: 'Plan.', Insights: 'Insights' }[route.name] || route.name) : route.name}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => navigation.navigate('Configuracoes')}
          onMouseEnter={() => setHoveredRoute('Configuracoes')}
          onMouseLeave={() => setHoveredRoute(null)}
          onHoverIn={() => setHoveredRoute('Configuracoes')}
          onHoverOut={() => setHoveredRoute(null)}
          style={[styles.siteTabItem, hoveredRoute === 'Configuracoes' && styles.siteTabItemHover]}
          accessibilityRole="button"
          accessibilityLabel="Configurações"
          title="Configurações"
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={17} color={hoveredRoute === 'Configuracoes' ? '#553584' : '#D1CBD8'} />
          <Text numberOfLines={1} style={[styles.siteTabLabel, width < 520 && styles.siteTabLabelCompact, hoveredRoute === 'Configuracoes' && styles.siteTabLabelAtivo]}>{width < 520 ? 'Config.' : 'Configurações'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CardsTabNavigator() {
  return (
    <CardsStack.Navigator screenOptions={{ headerShown: false }}>
      <CardsStack.Screen name="CartoesInicio" component={CardsScreen} />
      <CardsStack.Screen name="DetalhesCartao" component={CardDetailsScreen} />
    </CardsStack.Navigator>
  );
}

function Tabs({ onAbrirMenu }) {
  const { width } = useWindowDimensions();
  const { cores } = useTema();
  const web = Platform.OS === 'web';

  return (
    <Tab.Navigator
      tabBar={web ? (props) => <SiteTabBar {...props} /> : undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: 'bottom',
        tabBarActiveTintColor: cores.primario,
        tabBarInactiveTintColor: cores.textoSecundario,
        // A área reservada pelo navegador da barra também precisa acompanhar
        // o fundo do tema; transparente deixava aparecer o branco do documento.
        tabBarStyle: web ? { position: 'absolute', height: width < 520 ? 76 : 82, backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 } : {
          backgroundColor: cores.card,
          borderTopColor: cores.borda,
          height: 64,
          paddingTop: 7,
          paddingBottom: 7,
        },
        tabBarIcon: ({ color, size }) =>
          ICONES_ABAS[route.name] ? (
            <Ionicons name={ICONES_ABAS[route.name]} size={size} color={color} />
          ) : null,
      })}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Planejamento" component={PlanningScreen} />
      <Tab.Screen
        name="Adicionar"
        component={TelaVazia}
        options={{
          tabBarButton: () => <BotaoAdicionar onPress={onAbrirMenu} web={web} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            onAbrirMenu();
          },
        }}
      />
      <Tab.Screen name="Contas" component={ContasScreen} />
      {web && <Tab.Screen name="Cartões" component={CardsTabNavigator} />}
      <Tab.Screen name="Insights" component={InsightsScreen} />
    </Tab.Navigator>
  );
}

function AppPrincipal() {
  const { cores } = useTema();
  const { session, carregando: authCarregando, recuperacaoSenha } = useAuth();
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [onboardingVisto, setOnboardingVisto] = useState(true);
  const [avisoSync, setAvisoSync] = useState('');
  const [erroInicializacao, setErroInicializacao] = useState('');

  // Garante que o banco de dados (e suas migrações) já esteja pronto antes
  // de mostrar qualquer tela — evita telas piscando "carregando" uma por
  // uma logo na abertura do app. Um tempo mínimo de exibição evita que o
  // loading pisque rápido demais pra perceber quando o banco já existe.
  React.useEffect(() => {
    if (authCarregando) return undefined;
    if (!session?.user?.id || recuperacaoSenha) {
      setPronto(false);
      setAvisoSync('');
      setErroInicializacao('');
      return undefined;
    }

    let ativo = true;
    let pararSync = null;
    setPronto(false);
    setErroInicializacao('');
    setUsuarioAtual(session.user.id);
    const inicio = Date.now();
    getDb().then(async () => {
      if (!ativo) return;
      const monitorSync = iniciarSincronizacao(session.user.id);
      pararSync = monitorSync.parar;
      const falhaSync = await monitorSync.primeiraSync;
      if (ativo && falhaSync) {
        setAvisoSync('A conta entrou, mas a sincronização está aguardando a configuração do banco online ou uma conexão.');
      } else if (ativo) {
        setAvisoSync('');
      }
      if (!ativo) return;
      reagendarLembretes();
      const visto = await getOnboardingVisto();
      if (ativo) setOnboardingVisto(visto);
      const decorrido = Date.now() - inicio;
      const espera = Math.max(3000 - decorrido, 0);
      setTimeout(() => { if (ativo) setPronto(true); }, espera);
    }).catch((erro) => {
      console.error('Erro ao iniciar o Cash:', erro);
      if (ativo) setErroInicializacao('Não foi possível preparar seus dados neste dispositivo. Tente fechar e abrir o app novamente.');
    });
    return () => {
      ativo = false;
      if (pararSync) pararSync();
    };
  }, [authCarregando, session?.user?.id, recuperacaoSenha]);

  React.useEffect(() => {
    if (!pronto || Platform.OS !== 'android') return undefined;
    let ativo = true;
    let verificando = false;
    const abrirRevisaoSelecionada = async () => {
      if (!ativo || verificando || !navigationRef.isReady()) return;
      verificando = true;
      try {
        const purchaseId = obterNotificacaoSelecionada();
        if (purchaseId) navigationRef.navigate('RevisarCompra', { purchaseId });
      } finally {
        verificando = false;
      }
    };
    abrirRevisaoSelecionada();
    const timer = setInterval(abrirRevisaoSelecionada, 700);
    const inscricao = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') abrirRevisaoSelecionada();
    });
    return () => {
      ativo = false;
      clearInterval(timer);
      inscricao.remove();
    };
  }, [pronto, session?.user?.id]);

  async function finalizarOnboarding() {
    await marcarOnboardingVisto();
    setOnboardingVisto(true);
  }

  if (authCarregando) return <LoadingScreen />;
  if (!session) return <AuthScreen />;
  if (recuperacaoSenha) return <AuthScreen modoRedefinicao />;
  if (erroInicializacao) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F0EDF2' }}><Text style={{ textAlign: 'center', color: '#7F1D1D' }}>{erroInicializacao}</Text></View>;
  }
  if (!pronto) {
    return <LoadingScreen />;
  }

  if (!onboardingVisto) {
    return <OnboardingScreen onFinalizar={finalizarOnboarding} />;
  }

  return (
    <View style={{ flex: 1 }}>
    <NavigationContainer
      ref={navigationRef}
      theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: cores.fundo } }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs">
          {() => <Tabs onAbrirMenu={() => setMenuVisivel(true)} />}
        </Stack.Screen>
        <Stack.Screen
          name="AdicionarMovimentacao"
          component={AddTransactionScreen}
          options={{ presentation: 'fullScreenModal', keyboardHandlingEnabled: false }}
        />
        <Stack.Screen
          name="AdicionarContaRecorrente"
          component={AddRecurringScreen}
          options={{ presentation: 'fullScreenModal', keyboardHandlingEnabled: false }}
        />
        <Stack.Screen name="GerenciarCategorias" component={CategoriesScreen} />
        <Stack.Screen name="EditarLancamentos" component={EditListScreen} />
        <Stack.Screen
          name="SelecionarMes"
          component={MonthPickerScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="Cartoes" component={CardsScreen} />
        <Stack.Screen name="DetalhesCartao" component={CardDetailsScreen} />
        <Stack.Screen
          name="AdicionarCartao"
          component={AddCardScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="EditarCartao"
          component={EditCardScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="Metas" component={GoalsScreen} />
        <Stack.Screen
          name="AdicionarMeta"
          component={AddGoalScreen}
          options={{ presentation: 'fullScreenModal', keyboardHandlingEnabled: false }}
        />
        <Stack.Screen name="DetalhesMeta" component={GoalDetailScreen} />
        <Stack.Screen name="Configuracoes" component={SettingsScreen} />
        <Stack.Screen name="RevisarCompra" component={ReviewPurchaseScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="LerComprovante" component={ReceiptScreen} options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="Assinaturas" component={SubscriptionsScreen} />
      </Stack.Navigator>

      <Modal
        visible={menuVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisivel(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisivel(false)}>
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisivel(false);
                navigationRef.navigate('AdicionarMovimentacao');
              }}
            >
              <Ionicons name="create-outline" size={18} color="#8665B5" />
              <Text style={styles.menuItemTexto}>Lançar manualmente</Text>
            </TouchableOpacity>
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisivel(false);
                  navigationRef.navigate('LerComprovante');
                }}
              >
                <Ionicons name="receipt-outline" size={18} color="#8665B5" />
                <Text style={styles.menuItemTexto}>Ler comprovante</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </NavigationContainer>
    {!!avisoSync && <View style={styles.avisoSincronizacao}><Ionicons name="cloud-offline-outline" size={16} color="#744A14" /><Text style={styles.avisoSincronizacaoTexto}>{avisoSync}</Text></View>}
    </View>
  );
}

// Componente raiz do app: agora envolvido pelo ThemeProvider,
// que disponibiliza o tema (claro/escuro) para toda a árvore de telas.
export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MonthProvider>
          <AppPrincipal />
        </MonthProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  avisoSincronizacao: { position: 'absolute', bottom: Platform.OS === 'web' ? 14 : 72, left: 14, right: 14, zIndex: 500, backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  avisoSincronizacaoTexto: { flex: 1, fontSize: 11, lineHeight: 16, color: '#744A14' },
  siteTabBarWeb: { position: 'absolute', bottom: 0, left: 0, right: 0, height: Platform.OS === 'web' ? 82 : 64, width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 8, backgroundColor: 'transparent', zIndex: 100, overflow: 'visible' },
  siteTabBarPill: { width: '100%', maxWidth: 720, height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8, borderRadius: 23, backgroundColor: '#19171D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#17131D', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 8, overflow: 'visible' },
  siteTabItem: { flex: 1, minWidth: 0, height: 52, paddingHorizontal: 5, borderRadius: 17, alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative', zIndex: 1 },
  siteTabItemHover: {
    backgroundColor: '#E9DEFF',
    borderRadius: 17,
    zIndex: 50,
    elevation: 10,
  },
  siteTabItemAtivo: {
    backgroundColor: '#D7C8F0',
  },
  siteTabIconHover: { transform: [{ scale: 1.16 }] },
  siteTabLabel: { maxWidth: '100%', color: '#D1CBD8', fontSize: 9, fontWeight: '600' },
  siteTabLabelCompact: { fontSize: 8 },
  siteTabLabelAtivo: { color: '#553584' },
  siteAddSlot: { width: 54, alignItems: 'center', justifyContent: 'center' },
  botaoAdicionarWeb: {
    width: 52,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: '#9272C7',
    borderRadius: 17,
    paddingHorizontal: 4,
  },
  botaoAdicionarWebTexto: { color: '#fff', fontSize: 8, fontWeight: '700' },
  fabWrapper: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#8665B5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 110,
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 240,
    paddingVertical: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 14,
  },
  menuItemTexto: { fontSize: 14, color: '#1C1C1E' },
});
