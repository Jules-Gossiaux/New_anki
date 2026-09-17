// Re-export the native module. On web, it will be resolved to AndroidUsageDiagnosticsModule.web.ts
// and on native platforms to AndroidUsageDiagnosticsModule.ts
export { default } from './src/AndroidUsageDiagnosticsModule';
export * from './src/AndroidUsageDiagnostics.types';
