import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { AndroidUsageEvent } from './AndroidUsageDiagnostics.types';

type AndroidUsageDiagnosticsEvents = Record<string, never>;

declare class AndroidUsageDiagnosticsModule extends NativeModule<AndroidUsageDiagnosticsEvents> {
  hasUsageAccess(): boolean;
  openUsageAccessSettings(): void;
  getRecentEvents(windowMs: number): AndroidUsageEvent[];
  isReminderEnabled(): boolean;
  setReminderConfiguration(enabled: boolean, dueCardCount: number): void;
}

export default requireOptionalNativeModule<AndroidUsageDiagnosticsModule>(
  'AndroidUsageDiagnostics',
);
