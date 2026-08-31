#!/usr/bin/env bash
set -euo pipefail

# Physical-device GPS-gate validation for storm-path-mobile.
# Do not run inside dominiccalandro1991-byte/storm-path.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "SP_HW_SCRIPT repo=$(basename "$ROOT")"
if [[ "$(basename "$ROOT")" != "storm-path-mobile" ]]; then
  echo "REFUSING: this script must run from storm-path-mobile"
  exit 1
fi

if [[ -f StormpathV1_3_5.html || -f index.html ]]; then
  echo "REFUSING: web-core artifacts detected"
  exit 1
fi

npx tsc --noEmit

cat <<'EOF'
================================================================================
HARDWARE VALIDATION MATRIX — storm-path-mobile
Targets: physical iOS 17+ and Android 14+
Exclusive I/O trigger: first finite expo-location fix
Murphysboro 37.7645,-89.3351 is map-view only and MUST NOT appear in NWS/WMS URLs
unless that is the actual live GNSS fix.
================================================================================

A. Install / launch
  1. npm install
  2. npx expo start --tunnel --clear
  3. iOS 17+: Camera > Expo Go (SDK 57) OR development build from
     npx eas-cli build --profile development --platform ios
  4. Android 14+: Expo Go SDK 57 OR
     npx eas-cli build --profile development --platform android
  5. Deny location once, confirm Settings dump shows perm=false and
     driver remains safe. Grant When In Use. Relaunch.

B. Metro / device log filters
  iOS (macOS, device attached):
    npx expo start --ios
  Android 14+:
    adb logcat -s ReactNativeJS:V | grep SP_HW

C. Required event order
  1. SP_HW BOOT gps=false weatherIO=blocked radarIO=blocked murphysboroViewOnly=true
  2. SP_HW PERM granted=true
  3. SP_HW FIX first=true lat=... lon=...     <-- only after a finite device fix
  4. SP_HW NWS legal=true url=https://api.weather.gov/points/<live-lat>,<live-lon>
  5. SP_HW RADAR legal=true url=...bbox= derived from the same live fix (2.5 deg span)
  FAIL if SP_HW ILLEGAL_IO appears.
  FAIL if any weather.gov or opengeo URL is issued before first=true.
  FAIL if NWS/RADAR logs appear before first=true.

D. AND-gate after first fix
  Settings screen must show:
    gateFix=OPEN
    gpsAvailable=true after fix
    weatherOK / radarOK flip only after those legal I/O calls
    chips pressure/visibility/CAPE remain N/A
    weather panel copy stays conservative until all three flags are true

E. Negative tests
  Airplane mode after first fix: NWS/RADAR may fail; driver must recompute to safe.
  Revoke location: SP_HW GPS_FAIL; no new NWS/WMS until another finite fix.

F. Packaging after hardware PASS
  See STORE.md. Requires EXPO_TOKEN, Apple, and Play accounts.
EOF
