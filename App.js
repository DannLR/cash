import React, { useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider } from './context/ThemeContext';
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

function Tabs({ onAbrirMenu }) {
  const { width } = useWindowDimensions();
  // Barra no topo só em telas largas (computador/tablet). Em telas estreitas
  // — celular, seja app nativo ou navegador do celular — mantém embaixo.
  const web = Platform.OS === 'web' && width >= 768;
  const icones = {
    Início: 'home-outline',
    Planejamento: 'calendar-outline',
    Contas: 'repeat-outline',
    Insights: 'stats-chart-outline',
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: web ? 'top' : 'bottom',
        tabBarActiveTintColor: '#0F766E',
        tabBarInactiveTintColor: '#8A8A8E',
        tabBarLabelPosition: web ? 'beside-icon' : 'below-icon',
        tabBarStyle: web ? styles.tabBarWeb : undefined,
        tabBarItemStyle: web ? styles.tabItemWeb : undefined,
        tabBarIndicatorStyle: web ? styles.tabIndicatorWeb : undefined,
        tabBarIcon: ({ color, size }) =>
          icones[route.name] ? (
            <Ionicons name={icones[route.name]} size={web ? 18 : size} color={color} />
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
  tabBarWeb: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    borderTopWidth: 0,
    paddingHorizontal: '8%',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItemWeb: {
    width: 'auto',
    minWidth: 0,
    paddingHorizontal: 18,
    flexDirection: 'row',
  },
  tabIndicatorWeb: {
    backgroundColor: '#0F766E',
    height: 2,
  },
  botaoAdicionarWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F766E',
    borderRadius: 8,
    paddingVertical: 8,
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