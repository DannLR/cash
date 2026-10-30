import { Platform } from 'react-native';

function obterModuloNativo() {
  if (Platform.OS !== 'android') return null;
  return require('../modules/cash-notification-capture/src').default;
}

export async function temAcessoNotificacoesCompra() {
  const modulo = obterModuloNativo();
  return modulo ? modulo.hasNotificationAccess() : false;
}

export function abrirConfiguracaoNotificacoesCompra() {
  obterModuloNativo()?.openNotificationAccessSettings();
}

export function obterComprasPendentes() {
  const modulo = obterModuloNativo();
  if (!modulo) return [];
  try {
    return JSON.parse(modulo.getPendingPurchases() || '[]');
  } catch {
    return [];
  }
}

export function obterNotificacaoSelecionada() {
  return obterModuloNativo()?.takeSelectedPurchaseId() || '';
}

export function confirmarNotificacoesRevisadas(ids) {
  if (ids?.length) obterModuloNativo()?.acknowledgePurchases(ids);
}
