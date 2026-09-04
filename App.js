import React, { useState, useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
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

import { getDb } from './database/db';
import { getOnboardingVisto, marcarOnboardingVisto } from './database/queries';
import LoadingScreen from './components/LoadingScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { reagendarLembretes } from './utils/notifications';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Carrega as mesmas fontes que o site original usava (Space Grotesk pros
// títulos, DM Sans pro corpo do texto) e aplica como fonte padrão — só na
// web, pra não mexer na aparência do app nativo (que usa a fonte do sistema).
if (Platform.OS === 'web') {
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
      <TouchableOpacity style={styles.botaoAdicionarWeb} onPress={onPress} activeOpacity={0.85}>
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
  Insights: 'stats-chart-outline',
};

function SidebarTabBar({ state, descriptors, navigation }) {
  const { modoEscuro, alternarTema, cores } = useTema();

  return (
    <View style={[styles.sidebarWeb, { backgroundColor: cores.card, borderRightColor: cores.borda }]}>
      <View style={styles.sidebarLogoRow}>
        <View style={styles.sidebarLogoBox}>
          <Ionicons name="trending-up" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sidebarLogoTexto, { color: cores.texto }]}>cash</Text>
          <Text style={styles.sidebarLogoCaption}>CONTROLE FINANCEIRO</Text>
        </View>
        <TouchableOpacity onPress={alternarTema} style={styles.sidebarThemeBotao} activeOpacity={0.7}>
          <Ionicons name={modoEscuro ? 'sunny-outline' : 'moon-outline'} size={17} color={cores.textoSecundario} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sidebarSectionLabel}>SEU DINHEIRO</Text>

      <View style={styles.sidebarLista}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          // A aba "Adicionar" já tem seu próprio botão especial (abre o menu).
          if (options.tabBarButton) {
            return <View key={route.key}>{options.tabBarButton({})}</View>;
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
              activeOpacity={0.7}
              style={[styles.sidebarItemWeb, focado && styles.sidebarItemWebAtivo]}
            >
              {icone && <Ionicons name={icone} size={18} color={focado ? '#fff' : cores.textoSecundario} />}
              <Text style={[styles.sidebarItemTexto, { color: cores.textoSecundario }, focado && styles.sidebarItemTextoAtivo]}>
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.sidebarGoalCard, { backgroundColor: cores.fundo, borderColor: cores.borda }]}>
        <View style={styles.sidebarGoalIcone}>
          <Ionicons name="flag-outline" size={16} color={cores.primario} />
        </View>
        <Text style={styles.sidebarGoalKicker}>FOCO</Text>
        <Text style={[styles.sidebarGoalTitulo, { color: cores.texto }]}>Um mês de cada vez</Text>
        <Text style={styles.sidebarGoalDescricao}>
          Seu dinheiro fica mais claro quando o próximo passo também fica.
        </Text>
      </View>
    </View>
  );
}

function Tabs({ onAbrirMenu }) {
  const { width } = useWindowDimensions();
  // Barra lateral só em telas largas (computador/tablet). Em telas estreitas
  // — celular, seja app nativo ou navegador do celular — mantém embaixo.
  const web = Platform.OS === 'web' && width >= 768;

  return (
    <Tab.Navigator
      tabBar={web ? (props) => <SidebarTabBar {...props} /> : undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: web ? 'left' : 'bottom',
        tabBarActiveTintColor: '#0F766E',
        tabBarInactiveTintColor: '#8A8A8E',
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
          tabBarButton: () => <BotaoAdicionar onPress={onAbrirMenu} web={web} sidebar />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            onAbrirMenu();
          },
        }}
      />
      <Tab.Screen name="Contas" component={ContasScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
    </Tab.Navigator>
  );
}

function AppPrincipal() {
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [onboardingVisto, setOnboardingVisto] = useState(true);

  // Garante que o banco de dados (e suas migrações) já esteja pronto antes
  // de mostrar qualquer tela — evita telas piscando "carregando" uma por
  // uma logo na abertura do app. Um tempo mínimo de exibição evita que o
  // loading pisque rápido demais pra perceber quando o banco já existe.
  React.useEffect(() => {
    const inicio = Date.now();
    getDb().then(async () => {
      reagendarLembretes(); // não bloqueia a tela — roda em segundo plano
      const visto = await getOnboardingVisto();
      setOnboardingVisto(visto);
      const decorrido = Date.now() - inicio;
      const espera = Math.max(3000 - decorrido, 0);
      setTimeout(() => setPronto(true), espera);
    });
  }, []);

  async function finalizarOnboarding() {
    await marcarOnboardingVisto();
    setOnboardingVisto(true);
  }

  if (!pronto) {
    return <LoadingScreen />;
  }

  if (!onboardingVisto) {
    return <OnboardingScreen onFinalizar={finalizarOnboarding} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
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
              <Ionicons name="create-outline" size={18} color="#0F766E" />
              <Text style={styles.menuItemTexto}>Lançar manualmente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisivel(false);
                // Aqui depois vamos navegar para a tela de "Ler comprovante".
              }}
            >
              <Ionicons name="receipt-outline" size={18} color="#0F766E" />
              <Text style={styles.menuItemTexto}>Ler comprovante</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </NavigationContainer>
  );
}

// Componente raiz do app: agora envolvido pelo ThemeProvider,
// que disponibiliza o tema (claro/escuro) para toda a árvore de telas.
export default function App() {
  return (
    <ThemeProvider>
      <MonthProvider>
        <AppPrincipal />
      </MonthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  sidebarWeb: {
    width: 256,
    height: '100%',
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  sidebarLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  sidebarLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarLogoTexto: { fontSize: 17, fontWeight: '700', color: '#0F172A', fontFamily: 'Space Grotesk, sans-serif' },
  sidebarLogoCaption: { fontSize: 9, letterSpacing: 1, color: '#64748B', marginTop: 1 },
  sidebarThemeBotao: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarSectionLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#94A3B8',
    marginTop: 40,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  sidebarLista: { gap: 2 },
  sidebarItemWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 10,
  },
  sidebarItemWebAtivo: {
    backgroundColor: '#0F766E',
  },
  sidebarItemTexto: { fontSize: 14, fontWeight: '500', color: '#5B6472' },
  sidebarItemTextoAtivo: { color: '#fff' },
  sidebarGoalCard: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  sidebarGoalIcone: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(15,118,110,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarGoalKicker: { fontSize: 9, letterSpacing: 1.2, color: '#94A3B8', marginTop: 10 },
  sidebarGoalTitulo: { fontSize: 13, fontWeight: '600', color: '#0F172A', marginTop: 4, fontFamily: 'Space Grotesk, sans-serif' },
  sidebarGoalDescricao: { fontSize: 11, lineHeight: 16, color: '#64748B', marginTop: 4 },
  botaoAdicionarWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0F766E',
    borderRadius: 12,
    height: 42,
    marginBottom: 2,
    paddingHorizontal: 14,
  },
  botaoAdicionarWebTexto: { color: '#fff', fontSize: 13, fontWeight: '600' },
  fabWrapper: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0F766E',
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