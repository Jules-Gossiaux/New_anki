import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { AndroidUsageEvent } from './AndroidUsageDiagnostics.types';

type AndroidUsageDiagnosticsEvents = Record<string, never>;

declare class AndroidUsageDiagnosticsModule extends NativeModule<AndroidUsageDiagnosticsEvents> {
  hasUsageAccess(): boolean;
  openUsageAccessSettings(): void;
  getRecentEvents(windowMs: number): AndroidUsageEvent[];
}

export default requireOptionalNativeModule<AndroidUsageDiagnosticsModule>(
  'AndroidUsageDiagnostics',
);
