export type AndroidUsageEventType =
  | 'ACTIVITY_RESUMED'
  | 'ACTIVITY_PAUSED'
  | 'ACTIVITY_STOPPED'
  | 'SCREEN_INTERACTIVE'
  | 'SCREEN_NON_INTERACTIVE'
  | 'KEYGUARD_SHOWN'
  | 'KEYGUARD_HIDDEN'
  | 'DEVICE_SHUTDOWN'
  | 'CONFIGURATION_CHANGE'
  | `TYPE_${number}`;

export type AndroidUsageEvent = {
  timestamp: number;
  type: AndroidUsageEventType;
  typeCode: number;
  packageName: string | null;
  className: string | null;
};
