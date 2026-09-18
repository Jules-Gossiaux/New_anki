# Platform feasibility investigation

## Current scope

This investigation is Android-first. iOS is intentionally deferred and no iOS implementation is planned in this spike. The goal is to determine whether Android can support a reliable, opt-in reminder flow for the two Phase B product intents without claiming that the app can intercept every unlock or display an unrestricted overlay.

## Local spike prerequisites

The repository does not commit generated `android/` or `ios/` projects. The Expo configuration remains lightweight; native experimentation is performed through a local Expo module and a development build. Expo Go remains suitable for the existing JavaScript-only app but cannot validate this capability.

On 2026-09-17, the connected OnePlus NE2213 running Android 16 (API 36) was detected by `adb`. A user-local JDK 17 was configured, `expo-dev-client` was added, and an Expo development build compiled, installed, and included the local `AndroidUsageDiagnostics` module. The merged APK manifest contains `android.permission.PACKAGE_USAGE_STATS`. This proves the native integration path, not yet the reliability of the product behavior.

## Findings (September 2026)

### Android

`UsageStatsManager` can query device usage history and events, but most cross-app methods require `android.permission.PACKAGE_USAGE_STATS` and the user must grant Usage Access in Settings. This needs native Android code/configuration and is not available as an Expo Go-only feature. A three-minute threshold could be computed from usage events, but delivery timing, OEM background limits and battery behavior require a development-build spike. An unlock-specific app callback is not a general public Expo capability; the product should use a notification or supported foreground/usage-access flow.

The diagnostic screen is reachable from Settings on Android development builds. It exposes the Usage Access status, opens the system Usage Access screen and displays the last ten minutes of usage events. Its reminder controls are explicitly opt-in and start a visible foreground-service experiment; they do not select cards or alter FSRS. Delivery can be configured as a notification or as an Android system overlay prompt.

Manual validation on the OnePlus test device confirmed that the diagnostic can display `KEYGUARD_SHOWN`, `SCREEN_NON_INTERACTIVE`, `SCREEN_INTERACTIVE`, `KEYGUARD_HIDDEN`, `ACTIVITY_RESUMED`, `ACTIVITY_PAUSED`, and `ACTIVITY_STOPPED`. This proves that the required Usage Access data exists on that device. It does not yet prove reliable reminder delivery after every event: UsageStats can publish events after the first polling window. The service therefore re-reads a bounded overlap and de-duplicates events before updating its unlock and eligible-app session state. This implementation still requires repeated device validation and does not validate force-stop, reboot, battery optimization or production store-policy behavior.

The Android spike must answer these questions on a real device:

- Can the app detect a sufficiently reliable boundary for a phone-use sequence from usage events?
- Can it distinguish a continuous three-minute sequence from cumulative usage, and reset the sequence after screen lock?
- Can it identify selected applications without requesting broader access than necessary?
- Can a local notification be scheduled or delivered after the threshold when the app is backgrounded or closed?
- What happens after reboot, battery optimization, OEM restrictions and revoked Usage Access?
- Can the user grant, revoke and understand the permission without exposing vocabulary or review data?

The first prototype uses a development build, continuous usage, reset-on-lock semantics and excludes the Vocabulary app, Android system packages and the launcher from the test-duration measurement. A future product setting may replace this broad initial rule with an explicit application allowlist. It does not use an accessibility service or claim an unrestricted full-screen takeover.

The experimental reminder flow is implemented behind an explicit action on the diagnostic screen. When enabled, it stores a snapshot of the current number of new and today-review cards in Android `SharedPreferences` and starts an opt-in Android foreground service. The snapshot is recalculated whenever the user returns to the diagnostic screen, so a recently imported deck can activate reminders without disabling and re-enabling them manually. The service displays a persistent low-priority notification while active and polls Usage Access events once per second; it uses `KEYGUARD_HIDDEN`, which was observed on the test device, rather than the unreliable `USER_PRESENT` broadcast. It re-reads the previous fifteen seconds of events and de-duplicates them so a late UsageStats write cannot be silently missed. Each detected unlock requests a 3-card reminder. For fast device testing, 10 continuous seconds in an eligible foreground application without a lock request a 5-card reminder. Leaving an eligible app clears its session, and returning to it begins a new ten-second sequence even when the app remains in Android's recent-app list. The intended product threshold remains three minutes and must not be inferred from this test value.

Notification mode posts a review notification. Reminder mode requires Android's `SYSTEM_ALERT_WINDOW` permission and displays a small Vocabulary prompt above the active app; `Fermer` dismisses it and `Commencer` opens the existing intervention study route. Direct-opening mode requests that route immediately and falls back to a notification if Android blocks the background activity launch. If reminder permission is missing or the overlay cannot be added, the service falls back to a notification. This is an explicit user-facing overlay, not an AccessibilityService or hidden takeover. Notifications and overlays are skipped when the snapshot is zero. The snapshot is deliberately not a second source of truth for the SQLite database.

### iOS (deferred)

UIKit exposes protected-data availability changes (lock/unlock-related lifecycle signals) to the app process, not a general always-running cross-app unlock interception service. Screen Time APIs use Family Controls and Device Activity capabilities/entitlements, authorization and extensions; they are aimed at parental-control-style monitoring and require Apple review. They can support selected-app/domain usage thresholds in a native implementation, but not an assumed unrestricted “after every unlock” overlay. Expo alone is insufficient; a development build, config plugin/native module, entitlements and policy review would be required.

### Product implication

The safest first experiment remains an opt-in Android notification. The current implementation is a feasibility prototype, not yet a production commitment: it uses a user-refreshed snapshot and does not decrement that snapshot after a prompt. The intervention study route defaults to all decks and can optionally prioritize one deck. The overlay option is Android-only and requires the user to grant “display over other apps”; it is not available in Expo Go and is not cross-platform behavior. In an Expo development build, `vocabulary://…` is intercepted by the Expo development launcher, so the final study route still needs validation in a non-development-client Android build. iOS should investigate Device Activity authorization and an extension-based threshold, with a fallback to scheduled notifications. “Three reviews after unlock” and “five after three minutes” remain product intents, not cross-platform implementation promises.

## Evidence

- Expo recommends `create-expo-app` and supports development builds/native modules: <https://docs.expo.dev/get-started/create-a-project/>
- Android `UsageStatsManager` permission and Settings flow: <https://developer.android.com/reference/android/app/usage/UsageStatsManager>
- Apple lifecycle protected-data availability: <https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle>
- Apple Family Controls/Device Activity context and authorization: <https://developer.apple.com/videos/play/wwdc2021/10123/>
- Apple activity-data entitlement details: <https://developer.apple.com/documentation/familycontrols/familyactivitydata>

## Android spike acceptance criteria

The Android prototype must record permission UX, threshold accuracy, behavior after lock/reboot, background delivery, battery impact, privacy disclosure, Expo development-build requirements and Google Play policy risks. It must include a manual test matrix for: no due cards, daily limits exhausted, user opt-out, selected versus unselected applications, app backgrounded, app force-closed, reboot and permission revocation. Only then should an intervention adapter be selected.

The spike is successful only if the result clearly states which product intent is technically supported, what is approximate or unavailable, and which fallback should be shipped. A notification-based prompt remains the required fallback when usage events, overlay permission or exact background timing cannot be guaranteed.

### Interim conclusion

The Android-first data-observation prototype is feasible on the tested OnePlus device while Vocabulary is backgrounded. Notification delivery is validated, and an opt-in overlay path is implemented behind Android's “display over other apps” permission. The overlay is only a prompt; the existing study screen opens after the user presses `Commencer`. This is still not a production commitment: force-stop/reboot behavior, OEM battery restrictions, selected-app configuration, card-availability refresh during normal use, overlay discoverability and Google Play foreground-service/overlay policy require further validation.

## Next actions

1. Install/configure Android SDK Platform-Tools and verify `adb devices` with the test phone.
2. Enable the experimental reminders from the diagnostic screen and verify notification permission behavior.
3. Validate the foreground-service behavior after force-stop, reboot and battery optimization.
4. Validate the ten-second test alarm under those conditions and after locking early. The production threshold remains three minutes.
5. Validate notification and overlay delivery on supported Android versions and document the permission/policy decision before shipping.

## Manual validation procedure

1. Start the development server with `npx expo start --dev-client` and open the installed Android development build.
2. Open `Réglages` → `Diagnostic Android (Phase B)`.
3. Confirm that the initial state reports Usage Access as not granted.
4. Open the Android Usage Access settings from the diagnostic screen and grant access to Vocabulary.
5. Return to the app, press `Actualiser`, then use and lock the phone several times. Check whether screen/keyguard and foreground-application events appear with plausible timestamps.
6. Repeat with the app backgrounded and after revoking access. Record whether events stop, are delayed, or disappear.
7. With cards available, press `Activer les rappels expérimentaux` and grant notification permission.
8. Keep the persistent “Rappels de révision actifs” notification visible, background Vocabulary, unlock the phone, and check whether the 3-card prompt arrives. In notification mode, open it from the notification. In reminder mode, grant “Afficher par-dessus les autres applications” and check the prompt above the active app; `Fermer` dismisses it and `Commencer` opens the intervention study route. In direct-opening mode, verify that Vocabulary opens the study route or that the notification fallback appears. Do not force-close the app: force-stop ends any Android foreground service.
9. Unlock again and use an eligible third-party application continuously for at least 10 seconds. Check whether the 5-card prompt arrives, then repeat while locking before 10 seconds. Reopening an app from Android's recent-app list must start a fresh sequence.
10. Reopen the diagnostic screen and refresh the snapshot after studying cards. Confirm that disabling reminders stops later notifications and overlays.

This procedure is intentionally diagnostic. OEM battery policies may still suppress background work, and a production foreground-service declaration plus the overlay permission require Google Play policy and privacy review. A successful result still does not justify an unrestricted forced overlay or a claim of cross-platform support.
