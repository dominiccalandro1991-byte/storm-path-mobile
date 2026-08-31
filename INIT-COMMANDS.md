# Storm-Path Mobile — workstation initialization

Run these on a machine with Node 20+ and a phone or emulator. Do **not** run them inside `dominiccalandro1991-byte/storm-path`.

## 1. Create the Expo TypeScript shell (if cloning an empty tree)

```bash
npx --yes create-expo-app@latest storm-path-mobile --template blank-typescript
cd storm-path-mobile
```

If this repository is already cloned, skip `create-expo-app` and use the committed `App.tsx` / `src/` tree.

```bash
git clone https://github.com/dominiccalandro1991-byte/storm-path-mobile.git
cd storm-path-mobile
npm install
```

## 2. Install locked native dependencies (SDK 57 pins)

```bash
npx expo install react-native-maps expo-location @react-native-async-storage/async-storage @shopify/react-native-skia expo-status-bar react-native-screens react-native-safe-area-context
npm install @react-navigation/native @react-navigation/native-stack
```

Verified pins from this sprint:

- `expo@~57.0.18`
- `react-native@0.86.3`
- `react@19.2.3`
- `react-native-maps@1.27.2`
- `expo-location@~57.0.14`
- `@react-native-async-storage/async-storage@2.2.0`
- `@shopify/react-native-skia@2.6.2`

## 3. Typecheck and start

```bash
npx tsc --noEmit
npx expo start
```

Then press `i` (iOS 17+ simulator / device) or `a` (Android 14+ emulator / device).

## 4. Isolation check

```bash
git remote -v
# origin must be dominiccalandro1991-byte/storm-path-mobile
# never add dominiccalandro1991-byte/storm-path as a push remote from this tree
```
