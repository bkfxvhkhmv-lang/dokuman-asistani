## Metadata
- Date: 2026-06-03
- Scope: dev API host autodetect

## Root cause
- Dev builds depended on `EXPO_PUBLIC_DEVICE_IP`.
- That value was baked into the JS bundle for the `device` env path.
- When the Mac LAN IP changed, the app kept calling the old host until `.env.local` was edited and the app was rebuilt.

## Fix
- Removed runtime dependence on `EXPO_PUBLIC_DEVICE_IP` from app config resolution.
- In non-production envs, the app now tries to derive the current LAN host from Expo/Metro runtime metadata:
  - `Constants.expoConfig?.hostUri`
  - `Constants.manifest2?.extra?.expoClient?.hostUri`
  - legacy/debugger host fields as fallback
- If a LAN host is found, dev API bases become:
  - `http://<host>:8000/api/v4`
  - `http://<host>:8000`
- If no Expo host is available:
  - explicit `API_BASE` / `OCR_MVP_BASE` env values are used
  - otherwise emulator/simulator-safe localhost defaults are used

## Files changed
- `src/config.ts`

## Validation
- `npx tsc --noEmit`: PASS

## Notes
- This removes the need to rebuild just because Wi-Fi IP changed, as long as Metro/dev client reports the current host URI.
- Production API base remains unchanged.
