# Storm Path 1.0.0 — store bind

The app in this repository is the store binary. Engine, HUD, golden, and vector score run in GitHub Actions without Apple or Google accounts.

These steps still require your accounts. They are not done from this repo:

1. Apple Developer Program + App Store Connect app record for `byte.dominiccalandro.stormpathmobile`
2. Google Play Console app for `byte.dominiccalandro.stormpathmobile`
3. Expo account, then `eas init` so `app.json extra.eas.projectId` exists
4. GitHub secret `EXPO_TOKEN`
5. Actions → `storm-path-mobile-ci` → Run workflow → `eas_platform=all`
   or locally: `npm run eas:prod` then `npm run submit:ios` / `npm run submit:android`

Privacy URL for both stores:

`https://dominiccalandro1991-byte.github.io/storm-path-mobile/privacy.html`

Location permission copy is already in `app.json`. ITSAppUsesNonExemptEncryption is false.
