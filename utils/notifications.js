import { Platform } from 'react-native';
import { getContasParaLembretes, getNotificacoesAtivas } from '../database/queries';

// expo-notifications não suporta agendamento de notificações locais na web.
// Nesse ambiente os lembretes ficam desativados (sem quebrar o resto do app).
const Notifications = Platform.OS === 'web' ? null : require('expo-notifications');

// Faz as notificações aparecerem mesmo com o app aberto em primeiro plano.
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function real(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function pedirPermissaoNotificacoes() {
  if (!Notifications) return false;
  const atual = await Notifications.getPermissionsAsync();
  if (atual.status === 'granted') return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.status === 'granted';
}

// Cancela os lembretes agendados anteriormente e agenda de novo, um por
// conta recorrente ativa, para o próximo dia de vencimento de cada uma
// (às 9h). Chamado sempre que o app abre, ou depois de criar/editar/excluir
// uma conta — assim os lembretes nunca ficam desatualizados.
export async function reagendarLembretes() {
  if (!Notifications) return;
  const ativado = await getNotificacoesAtivas();
  if (!ativado) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }

  const permitido = await pedirPermissaoNotificacoes();
  if (!permitido) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const contas = await getContasParaLembretes();
  const hoje = new Date();

  for (const conta of contas) {
    let dataAlvo = new Date(hoje.getFullYear(), hoje.getMonth(), conta.diaVencimento, 9, 0, 0);
    if (dataAlvo <= hoje) {
      dataAlvo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, conta.diaVencimento, 9, 0, 0);
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Conta vencendo hoje',
        body: `${conta.nome} — ${real(conta.valor)}`,
      },
      trigger: dataAlvo,
    });
  }
}