# Platform feasibility investigation

## Current scope

This investigation is Android-first. iOS is intentionally deferred and no iOS implementation is planned in this spike. The goal is to determine whether Android can support a reliable, opt-in reminder flow for the two Phase B product intents without claiming that the app can intercept every unlock or display an unrestricted overlay.

## Local spike prerequisites

The repository currently has no generated `android/` or `ios/` project and the Expo configuration only uses the existing Expo Router and SQLite plugins. Java 17 is available in the current environment, but Android `adb` is not currently available on the PATH. A real-device spike therefore requires installing/configuring the Android SDK Platform-Tools, enabling USB debugging on the test device, and creating an Expo development build before native APIs can be tested. Expo Go remains suitable for the existing JavaScript-only app but cannot validate this capability.

On 2026-09-17, the connected OnePlus NE2213 running Android 16 (API 36) was detected by `adb`, and the first Expo development build compiled and installed successfully after configuring a user-local JDK 17. The build currently validates only the native runtime; Usage Access is not yet requested or read.

## Findings (September 2026)

### Android

`UsageStatsManager` can query device usage history and events, but most cross-app methods require `android.permission.PACKAGE_USAGE_STATS` and the user must grant Usage Access in Settings. This needs native Android code/configuration and is not available as an Expo Go-only feature. A three-minute threshold could be computed from usage events, but delivery timing, OEM background limits and battery behavior require a development-build spike. An unlock-specific app callback is not a general public Expo capability; the product should use a notification or supported foreground/usage-access flow.

The Android spike must answer these questions on a real device:

- Can the app detect a sufficiently reliable boundary for a phone-use sequence from usage events?
- Can it distinguish a continuous three-minute sequence from cumulative usage, and reset the sequence after screen lock?
- Can it identify selected applications without requesting broader access than necessary?
- Can a local notification be scheduled or delivered after the threshold when the app is backgrounded or closed?
- What happens after reboot, battery optimization, OEM restrictions and revoked Usage Access?
- Can the user grant, revoke and understand the permission without exposing vocabulary or review data?

The first prototype should use a development build, a narrow allowlist of selected applications, continuous usage, reset-on-lock semantics and a notification that opens the existing study screen. It must not implement an accessibility-service overlay or a forced full-screen intervention.

### iOS (deferred)

UIKit exposes protected-data availability changes (lock/unlock-related lifecycle signals) to the app process, not a general always-running cross-app unlock interception service. Screen Time APIs use Family Controls and Device Activity capabilities/entitlements, authorization and extensions; they are aimed at parental-control-style monitoring and require Apple review. They can support selected-app/domain usage thresholds in a native implementation, but not an assumed unrestricted “after every unlock” overlay. Expo alone is insufficient; a development build, config plugin/native module, entitlements and policy review would be required.

### Product implication

The safest first experiment is local due-card notifications and an in-app review prompt. Android usage-based reminders are a possible opt-in track after a native spike. iOS should investigate Device Activity authorization and an extension-based threshold, with a fallback to scheduled notifications. “Three reviews after unlock” and “five after three minutes” remain product intents, not cross-platform implementation promises.

## Evidence

- Expo recommends `create-expo-app` and supports development builds/native modules: <https://docs.expo.dev/get-started/create-a-project/>
- Android `UsageStatsManager` permission and Settings flow: <https://developer.android.com/reference/android/app/usage/UsageStatsManager>
- Apple lifecycle protected-data availability: <https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle>
- Apple Family Controls/Device Activity context and authorization: <https://developer.apple.com/videos/play/wwdc2021/10123/>
- Apple activity-data entitlement details: <https://developer.apple.com/documentation/familycontrols/familyactivitydata>

## Android spike acceptance criteria

The Android prototype must record permission UX, threshold accuracy, behavior after lock/reboot, background delivery, battery impact, privacy disclosure, Expo development-build requirements and Google Play policy risks. It must include a manual test matrix for: no due cards, daily limits exhausted, user opt-out, selected versus unselected applications, app backgrounded, app force-closed, reboot and permission revocation. Only then should an intervention adapter be selected.

The spike is successful only if the result clearly states which product intent is technically supported, what is approximate or unavailable, and which fallback should be shipped. A notification-based prompt is the preferred fallback when direct unlock or exact background timing cannot be guaranteed.

## Next actions

1. Install/configure Android SDK Platform-Tools and verify `adb devices` with the test phone.
2. Add the smallest development-build setup required for native Android experimentation; do not add Usage Access or background services before the API boundary is selected.
3. Build a read-only diagnostic prototype that reports permission state and recent usage events locally, without vocabulary content or automatic interventions.
4. Measure the event sequence, lock/reset behavior and background reliability on the real device.
5. Decide whether the first shippable slice is an Android notification prompt, an in-app prompt on resume, or a documented limitation.
