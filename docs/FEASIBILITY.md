# Platform feasibility investigation

## Findings (September 2026)

### Android

`UsageStatsManager` can query device usage history and events, but most cross-app methods require `android.permission.PACKAGE_USAGE_STATS` and the user must grant Usage Access in Settings. This needs native Android code/configuration and is not available as an Expo Go-only feature. A three-minute threshold could be computed from usage events, but delivery timing, OEM background limits and battery behavior require a development-build spike. An unlock-specific app callback is not a general public Expo capability; the product should use a notification or supported foreground/usage-access flow.

### iOS

UIKit exposes protected-data availability changes (lock/unlock-related lifecycle signals) to the app process, not a general always-running cross-app unlock interception service. Screen Time APIs use Family Controls and Device Activity capabilities/entitlements, authorization and extensions; they are aimed at parental-control-style monitoring and require Apple review. They can support selected-app/domain usage thresholds in a native implementation, but not an assumed unrestricted “after every unlock” overlay. Expo alone is insufficient; a development build, config plugin/native module, entitlements and policy review would be required.

### Product implication

The safest first experiment is local due-card notifications and an in-app review prompt. Android usage-based reminders are a possible opt-in track after a native spike. iOS should investigate Device Activity authorization and an extension-based threshold, with a fallback to scheduled notifications. “Three reviews after unlock” and “five after three minutes” remain product intents, not cross-platform implementation promises.

## Evidence

- Expo recommends `create-expo-app` and supports development builds/native modules: <https://docs.expo.dev/get-started/create-a-project/>
- Android `UsageStatsManager` permission and Settings flow: <https://developer.android.com/reference/android/app/usage/UsageStatsManager>
- Apple lifecycle protected-data availability: <https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle>
- Apple Family Controls/Device Activity context and authorization: <https://developer.apple.com/videos/play/wwdc2021/10123/>
- Apple activity-data entitlement details: <https://developer.apple.com/documentation/familycontrols/familyactivitydata>

## Spike acceptance criteria

Real-device prototypes must record permission UX, threshold accuracy, behavior after lock/reboot, background delivery, battery impact, privacy disclosure, Expo development-build requirements and store-review risks for each platform. Only then should an intervention adapter be selected.
