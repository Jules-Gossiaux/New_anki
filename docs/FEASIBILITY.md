# Platform feasibility investigation

## Current scope

This investigation is Android-first. iOS is intentionally deferred and no iOS implementation is planned in this spike. The goal is to determine whether Android can support a reliable, opt-in reminder flow for the two Phase B product intents without claiming that the app can intercept every unlock or display an unrestricted overlay.

## Local spike prerequisites

The repository does not commit generated `android/` or `ios/` projects. The Expo configuration remains lightweight; native experimentation is performed through a local Expo module and a development build. Expo Go remains suitable for the existing JavaScript-only app but cannot validate this capability.

On 2026-09-17, the connected OnePlus NE2213 running Android 16 (API 36) was detected by `adb`. A user-local JDK 17 was configured, `expo-dev-client` was added, and an Expo development build compiled, installed, and included the local `AndroidUsageDiagnostics` module. The merged APK manifest contains `android.permission.PACKAGE_USAGE_STATS`. This proves the native integration path, not yet the reliability of the product behavior.

## Findings (September 2026)

### Android

`UsageStatsManager` can query device usage history and events, but most cross-app methods require `android.permission.PACKAGE_USAGE_STATS` and the user must grant Usage Access in Settings. This needs native Android code/configuration and is not available as an Expo Go-only feature. A three-minute threshold could be computed from usage events, but delivery timing, OEM background limits and battery behavior require a development-build spike. An unlock-specific app callback is not a general public Expo capability; the product should use a notification or supported foreground/usage-access flow.

The current read-only diagnostic prototype is reachable from Settings on Android development builds. It exposes the Usage Access status, opens the system Usage Access screen, and displays the last ten minutes of usage events. It does not schedule notifications, select cards, alter FSRS, monitor continuously, or show an overlay.

Manual validation on the OnePlus test device succeeded. The diagnostic displayed `KEYGUARD_SHOWN`, `SCREEN_NON_INTERACTIVE`, `SCREEN_INTERACTIVE`, and `KEYGUARD_HIDDEN` around a lock/unlock sequence, as well as `ACTIVITY_RESUMED`, `ACTIVITY_PAUSED`, and `ACTIVITY_STOPPED` for Vocabulary and other applications. This confirms that Android exposes enough historical data to reconstruct unlocks and foreground-application sequences after querying it. It does not yet prove that the app can be woken and notify the user at the exact moment while it is fully backgrounded or force-closed.

The Android spike must answer these questions on a real device:

- Can the app detect a sufficiently reliable boundary for a phone-use sequence from usage events?
- Can it distinguish a continuous three-minute sequence from cumulative usage, and reset the sequence after screen lock?
- Can it identify selected applications without requesting broader access than necessary?
- Can a local notification be scheduled or delivered after the threshold when the app is backgrounded or closed?
- What happens after reboot, battery optimization, OEM restrictions and revoked Usage Access?
- Can the user grant, revoke and understand the permission without exposing vocabulary or review data?

The first prototype uses a development build, continuous usage, reset-on-lock semantics and notifications that open the application home screen. It excludes the Vocabulary app, Android system packages and the launcher from the test-duration measurement. A future product setting may replace this broad initial rule with an explicit application allowlist. It does not implement an accessibility-service overlay or a forced full-screen intervention.

The experimental reminder flow is now implemented behind an explicit action on the diagnostic screen. When enabled, it stores a snapshot of the current number of new and today-review cards in Android `SharedPreferences` and starts an opt-in Android foreground service. The snapshot is recalculated whenever the user returns to the diagnostic screen, so a recently imported deck can activate reminders without disabling and re-enabling them manually. The service displays a persistent low-priority notification while active, dynamically receives `USER_PRESENT` and sends a 3-card notification. For fast device testing, it polls the Usage Access history once per second; after 10 continuous seconds in an eligible foreground application without a lock, it sends a 5-card notification. The intended product threshold remains three minutes and must not be inferred from this test value. Notifications are skipped when the snapshot is zero or notification permission is denied. The snapshot is deliberately not a second source of truth for the SQLite database.

### iOS (deferred)

UIKit exposes protected-data availability changes (lock/unlock-related lifecycle signals) to the app process, not a general always-running cross-app unlock interception service. Screen Time APIs use Family Controls and Device Activity capabilities/entitlements, authorization and extensions; they are aimed at parental-control-style monitoring and require Apple review. They can support selected-app/domain usage thresholds in a native implementation, but not an assumed unrestricted “after every unlock” overlay. Expo alone is insufficient; a development build, config plugin/native module, entitlements and policy review would be required.

### Product implication

The safest first experiment is an opt-in Android notification that opens the application home screen. The current implementation is a feasibility prototype, not yet a finished review flow: it uses a user-refreshed snapshot, does not select a deck, and does not decrement that snapshot after a notification. iOS should investigate Device Activity authorization and an extension-based threshold, with a fallback to scheduled notifications. “Three reviews after unlock” and “five after three minutes” remain product intents, not cross-platform implementation promises.

## Evidence

- Expo recommends `create-expo-app` and supports development builds/native modules: <https://docs.expo.dev/get-started/create-a-project/>
- Android `UsageStatsManager` permission and Settings flow: <https://developer.android.com/reference/android/app/usage/UsageStatsManager>
- Apple lifecycle protected-data availability: <https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle>
- Apple Family Controls/Device Activity context and authorization: <https://developer.apple.com/videos/play/wwdc2021/10123/>
- Apple activity-data entitlement details: <https://developer.apple.com/documentation/familycontrols/familyactivitydata>

## Android spike acceptance criteria

The Android prototype must record permission UX, threshold accuracy, behavior after lock/reboot, background delivery, battery impact, privacy disclosure, Expo development-build requirements and Google Play policy risks. It must include a manual test matrix for: no due cards, daily limits exhausted, user opt-out, selected versus unselected applications, app backgrounded, app force-closed, reboot and permission revocation. Only then should an intervention adapter be selected.

The spike is successful only if the result clearly states which product intent is technically supported, what is approximate or unavailable, and which fallback should be shipped. A notification-based prompt is the preferred fallback when direct unlock or exact background timing cannot be guaranteed.

### Interim conclusion

The data-observation part is feasible on the tested Android device. The product behavior is only partially feasible at this stage: the foreground-service reminder flow still needs real-device validation while the app is backgrounded. The prototype only emits notifications and opens the application home screen when the user taps one. A production decision must also assess Android foreground-service policy before shipping this mechanism.

## Next actions

1. Install/configure Android SDK Platform-Tools and verify `adb devices` with the test phone.
2. Enable the experimental reminders from the diagnostic screen and verify notification permission behavior.
3. Measure unlock notification delivery while Vocabulary is backgrounded and force-closed.
4. Measure the ten-second test alarm after using an eligible application, after locking early, after reboot and under battery restrictions. The production threshold remains three minutes.
5. Decide whether the first shippable slice can use this notification adapter or must fall back to an in-app prompt on resume.

## Manual validation procedure

1. Start the development server with `npx expo start --dev-client` and open the installed Android development build.
2. Open `Réglages` → `Diagnostic Android (Phase B)`.
3. Confirm that the initial state reports Usage Access as not granted.
4. Open the Android Usage Access settings from the diagnostic screen and grant access to Vocabulary.
5. Return to the app, press `Actualiser`, then use and lock the phone several times. Check whether screen/keyguard and foreground-application events appear with plausible timestamps.
6. Repeat with the app backgrounded and after revoking access. Record whether events stop, are delayed, or disappear.
7. With cards available, press `Activer les rappels expérimentaux` and grant notification permission.
8. Keep the persistent “Rappels de révision actifs” notification visible, background Vocabulary, unlock the phone, and check whether the 3-card notification arrives. Do not force-close the app: force-stop ends any Android foreground service.
9. Unlock again and use an eligible third-party application continuously for at least 10 seconds. Check whether the 5-card notification arrives, then repeat while locking before 10 seconds.
10. Reopen the diagnostic screen and refresh the snapshot after studying cards. Confirm that disabling reminders stops later notifications.

This procedure is intentionally diagnostic. OEM battery policies may still suppress background work, and a production foreground-service declaration requires a Google Play policy review. A successful result still does not justify a forced overlay or a claim of cross-platform support.
