import { registerWebModule, NativeModule } from 'expo';

// AndroidUsageDiagnosticsModule is not available on the web platform.
class AndroidUsageDiagnosticsModule extends NativeModule<Record<string, never>> {}

export default registerWebModule(AndroidUsageDiagnosticsModule, 'AndroidUsageDiagnosticsModule');
