# Android Dev Build Diagnosis

## Report Metadata
- Author/Agent: Codex
- Role: Android native build environment diagnosis
- Date: 2026-06-02
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: none
- Task type: audit / validation
- Scope: Android dev build environment only; no feature/UI/i18n code changes
- Status: PARTIAL

## 1. Scope
- Inspected only Android native build environment inputs:
  - Node
  - Java / `JAVA_HOME`
  - Gradle wrapper
  - Android SDK visibility
  - `settings.gradle` plugin resolution path
- Did not touch:
  - feature/UI/i18n files
  - Android source/build config files
  - package versions
  - Expo / RN upgrades

## 2. Search commands used
- `cd /Users/bayramgul/bp_canavar_v6_refactor && node -v`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && java -version`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && /usr/libexec/java_home -V`
- `cd /Users/bayramgul/bp_canavar_v6_refactor/android && ./gradlew --version`
- `sed -n '1,80p' /Users/bayramgul/bp_canavar_v6_refactor/android/settings.gradle`
- `sed -n '1,140p' /Users/bayramgul/bp_canavar_v6_refactor/android/build.gradle`
- `cat /Users/bayramgul/bp_canavar_v6_refactor/android/gradle/wrapper/gradle-wrapper.properties`
- `sed -n '1,160p' /Users/bayramgul/bp_canavar_v6_refactor/package.json`
- `cd /Users/bayramgul/bp_canavar_v6_refactor/android && ./gradlew app:assembleDebug -x lint -x test --stacktrace --info -PreactNativeDevServerPort=8081 -PreactNativeArchitectures=arm64-v8a`
- `echo "$ANDROID_HOME" && echo "$ANDROID_SDK_ROOT"`
- `ls -d /Users/bayramgul/Library/Android/sdk /Users/bayramgul/Library/Android/Sdk $HOME/Library/Android/sdk $HOME/Library/Android/Sdk 2>/dev/null`
- `export JAVA_HOME=$(/usr/libexec/java_home -v 17) && export PATH="$JAVA_HOME/bin:$PATH" && export ANDROID_HOME=/Users/bayramgul/Library/Android/Sdk && export ANDROID_SDK_ROOT=/Users/bayramgul/Library/Android/Sdk && cd /Users/bayramgul/bp_canavar_v6_refactor/android && ./gradlew app:assembleDebug -x lint -x test --stacktrace --info -PreactNativeDevServerPort=8081 -PreactNativeArchitectures=arm64-v8a`

## 3. Files touched
- [2026-06-02-codex-android-dev-build-diagnosis.md](/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-android-dev-build-diagnosis.md)
  - reason: permanent diagnosis report
  - type: docs

## 4. Findings
- status: fixed
  - severity: blocker
  - user impact: Android dev build fails before app compilation starts
  - technical root cause: local shell was using JDK 26
  - evidence:
    - `java -version` => `openjdk version "26"`
    - `./gradlew --version` => `Launcher JVM: 26`
    - stacktrace root cause:
      - `Caused by: java.lang.IllegalArgumentException: 26`
      - `org.jetbrains.kotlin.com.intellij.util.lang.JavaVersion.parse`
      - failure surfaced as `Error resolving plugin [id: 'com.facebook.react.settings']`
  - minimal solution: run Gradle/Expo with JDK 17

- status: fixed
  - severity: blocker
  - user impact: after JDK fix, build still fails during Android config
  - technical root cause: Android SDK path was not exposed to Gradle
  - evidence:
    - `ANDROID_HOME` and `ANDROID_SDK_ROOT` were empty
    - failure after JDK 17:
      - `SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path in your project's local properties file`
    - SDK exists locally at:
      - `/Users/bayramgul/Library/Android/Sdk`
  - minimal solution: export `ANDROID_HOME` and `ANDROID_SDK_ROOT` to that path

- status: intentional
  - severity: later
  - user impact: none
  - technical root cause: no repo config was changed because task asked for minimal diagnosis first
  - minimal solution: keep fix command-only unless persistent local setup is explicitly approved

## 5. Decisions
- What was changed:
  - no build files or app code changed
  - only environment-based validation was performed
- What was deliberately not changed:
  - no `android/gradle.properties`
  - no `android/local.properties`
  - no Gradle wrapper changes
  - no Expo / RN / package upgrades
- Why:
  - root cause was local environment mismatch, not project source

## 6. Validation
- Initial failure with default environment:
  - `java -version` => JDK 26
  - `./gradlew app:assembleDebug ...` failed in `android/settings.gradle` line 21
  - plugin resolution error hid the deeper cause, but stacktrace showed Kotlin/Gradle Java parsing failure on `26`
- Second validation with env-only fix:
  - `JAVA_HOME=$(/usr/libexec/java_home -v 17)` resolved plugin phase
  - next blocker became missing Android SDK path
- Third validation with both env fixes:
  - `JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home`
  - `ANDROID_HOME=/Users/bayramgul/Library/Android/Sdk`
  - `ANDROID_SDK_ROOT=/Users/bayramgul/Library/Android/Sdk`
  - build advanced through:
    - `com.facebook.react.settings` resolution
    - Expo/React Native plugin configuration
    - `:app` configuration
    - NDK/CMake/native compilation steps
  - result: initial blockers were cleared
- Remaining risk:
  - full `assembleDebug` completion was not waited to final APK line in this turn because native dependency compilation is lengthy
  - but the original blocker is no longer the cause once JDK 17 + SDK env are set

## 7. Minimal fix
- Use this for the current shell/session:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME=/Users/bayramgul/Library/Android/Sdk
export ANDROID_SDK_ROOT=/Users/bayramgul/Library/Android/Sdk
cd /Users/bayramgul/bp_canavar_v6_refactor
npx expo run:android
```

- Equivalent Gradle validation command:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME=/Users/bayramgul/Library/Android/Sdk
export ANDROID_SDK_ROOT=/Users/bayramgul/Library/Android/Sdk
cd /Users/bayramgul/bp_canavar_v6_refactor/android
./gradlew app:assembleDebug -x lint -x test -PreactNativeDevServerPort=8081 -PreactNativeArchitectures=arm64-v8a
```

- Optional persistent local-only follow-up, not applied:
  - add `sdk.dir=/Users/bayramgul/Library/Android/Sdk` to `android/local.properties`
  - optionally pin shell/profile `JAVA_HOME` to JDK 17 for this project

## 8. Commit
- commit hash: none
- commit message: none

## 9. Follow-ups
- If you want a persistent local fix, add `sdk.dir` to `android/local.properties` and/or a project-specific shell wrapper that exports JDK 17.
- If `npx expo run:android` still fails after these exports, the next step is a fresh build log from the post-JDK17/post-SDK state, not the old `com.facebook.react.settings` error.

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-android-dev-build-diagnosis.md`

Follow-up owner suggestion:
- Codex: persistent local Android environment pinning if explicitly requested
