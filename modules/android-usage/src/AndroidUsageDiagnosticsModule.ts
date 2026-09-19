import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { AndroidUsageEvent } from './AndroidUsageDiagnostics.types';

type AndroidUsageDiagnosticsEvents = Record<string, never>;

declare class AndroidUsageDiagnosticsModule extends NativeModule<AndroidUsageDiagnosticsEvents> {
  hasUsageAccess(): boolean;
  openUsageAccessSettings(): void;
  getRecentEvents(windowMs: number): AndroidUsageEvent[];
  hasOverlayPermission(): boolean;
  openOverlaySettings(): void;
  isReminderEnabled(): boolean;
  setReminderConfiguration(enabled: boolean, dueCardCount: number): void;
  setUsageReminderDuration?: (minutes: number) => void;
  setInterventionCardLimits?: (unlockCards: number, appUsageCards: number) => void;
  sendTestNotification(): void;
  setInterventionPromptMode(mode: 'notification' | 'overlay_prompt' | 'direct'): void;
}

export default requireOptionalNativeModule<AndroidUsageDiagnosticsModule>(
  'AndroidUsageDiagnostics',
);
