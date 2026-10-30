import { NativeModule, requireNativeModule } from 'expo';

declare class CashNotificationCaptureModule extends NativeModule {
  hasNotificationAccess(): boolean;
  openNotificationAccessSettings(): void;
  getPendingPurchases(): string;
  takeSelectedPurchaseId(): string;
  acknowledgePurchases(ids: string[]): void;
}

export default requireNativeModule<CashNotificationCaptureModule>('CashNotificationCapture');
