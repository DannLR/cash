import React, { useState, useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import CashLogo from './components/CashLogo';
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

function SidebarTabBar({ state, descriptors, navigation }) {
  const { modoEscuro, alternarTema } = useTema();
  const [hoveredRoute, setHoveredRoute] = useState(null);

  return (
    <View style={styles.sidebarWeb}>
      <CashLogo size={38} style={styles.sidebarLogoBox} />
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
              onMouseEnter={() => setHoveredRoute(route.key)}
              onMouseLeave={() => setHoveredRoute(null)}
              onHoverIn={() => setHoveredRoute(route.key)}
              onHoverOut={() => setHoveredRoute(null)}
              activeOpacity={0.7}
              accessibilityLabel={route.name}
              title={route.name}
              style={[styles.sidebarItemWeb, focado && styles.sidebarItemWebAtivo, hoveredRoute === route.key && styles.sidebarItemWebHover]}
            >
              {icone && (
                <>
                  <Ionicons
                    name={icone}
                    size={18}
                    color={focado || hoveredRoute === route.key ? '#553584' : '#B9B3C2'}
                    style={hoveredRoute === route.key && styles.sidebarIconeHover}
                  />
                  {hoveredRoute === route.key && (
                    <View pointerEvents="none" style={styles.sidebarTooltip}>
                      <Text style={styles.sidebarTooltipTexto}>{route.name}</Text>
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sidebarBottom}>
        {[
          { key: 'Metas', label: 'Metas', icon: 'flag-outline', onPress: () => navigation.navigate('Metas') },
          { key: 'Configuracoes', label: 'Configurações', icon: 'settings-outline', onPress: () => navigation.navigate('Configuracoes') },
          { key: 'Tema', label: modoEscuro ? 'Tema claro' : 'Tema escuro', icon: modoEscuro ? 'sunny-outline' : 'moon-outline', onPress: alternarTema },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={item.onPress}
            onMouseEnter={() => setHoveredRoute(item.key)}
            onMouseLeave={() => setHoveredRoute(null)}
            onHoverIn={() => setHoveredRoute(item.key)}
            onHoverOut={() => setHoveredRoute(null)}
            style={[styles.sidebarItemWeb, hoveredRoute === item.key && styles.sidebarItemWebHover]}
            accessibilityLabel={item.label}
            title={item.label}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={18} color={hoveredRoute === item.key ? '#553584' : '#B9B3C2'} style={hoveredRoute === item.key && styles.sidebarIconeHover} />
            {hoveredRoute === item.key && (
              <View pointerEvents="none" style={styles.sidebarTooltip}>
                <Text style={styles.sidebarTooltipTexto}>{item.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
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
  // Barra lateral só em telas largas (computador/tablet). Em telas estreitas
  // — celular, seja app nativo ou navegador do celular — mantém embaixo.
  const web = Platform.OS === 'web' && width >= 768;

  return (
    <Tab.Navigator
      tabBar={web ? (props) => <SidebarTabBar {...props} /> : undefined}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: web ? 'left' : 'bottom',
        tabBarActiveTintColor: cores.primario,
        tabBarInactiveTintColor: cores.textoSecundario,
        tabBarStyle: web ? undefined : {
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
      {web && <Tab.Screen name="Cartões" component={CardsTabNavigator} />}
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
              <Ionicons name="create-outline" size={18} color="#8665B5" />
              <Text style={styles.menuItemTexto}>Lançar manualmente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisivel(false);
                // Aqui depois vamos navegar para a tela de "Ler comprovante".
              }}
            >
              <Ionicons name="receipt-outline" size={18} color="#8665B5" />
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
    width: 72,
    height: '100%',
    paddingTop: 18,
    paddingHorizontal: 12,
    paddingBottom: 14,
    alignItems: 'center',
    backgroundColor: '#19171D',
    zIndex: 100,
    overflow: 'visible',
  },
  sidebarLogoBox: {
    marginBottom: 25,
  },
  sidebarLista: { alignItems: 'center', gap: 10, width: '100%' },
  sidebarItemWeb: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  sidebarItemWebHover: {
    backgroundColor: '#E9DEFF',
    borderRadius: 999,
    zIndex: 50,
    elevation: 10,
  },
  sidebarItemWebAtivo: {
    backgroundColor: '#D7C8F0',
    borderRadius: 999,
  },
  sidebarIconeHover: { transform: [{ scale: 1.18 }] },
  sidebarTooltip: {
    position: 'absolute',
    left: 52,
    top: 2,
    minWidth: 92,
    height: 34,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#6B4AA5',
    borderRadius: 999,
    zIndex: 200,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  sidebarTooltipTexto: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sidebarBottom: { marginTop: 'auto', alignItems: 'center', gap: 8 },
  botaoAdicionarWeb: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9272C7',
    borderRadius: 14,
    marginBottom: 2,
    paddingHorizontal: 0,
  },
  botaoAdicionarWebTexto: { display: 'none' },
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
