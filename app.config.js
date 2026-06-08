/**
 * app.json ile birleştirilir; EXPO_PUBLIC_* burada okunur.
 *
 * Prod / EAS: EXPO_PUBLIC_SUPABASE_URL Secrets veya eas env ile ver — boş bırakma.
 * Kontrol: EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co npm run verify:supabase-extra
 */

module.exports = ({ config }) => {
  const url = typeof process.env.EXPO_PUBLIC_SUPABASE_URL === 'string'
    ? process.env.EXPO_PUBLIC_SUPABASE_URL.trim()
    : '';

  const prodish =
    process.env.EAS_BUILD === 'true' ||
    process.env.NODE_ENV === 'production';

  if (prodish && !url) {
    // eslint-disable-next-line no-console
    console.warn(
      '[BriefPilot] EXPO_PUBLIC_SUPABASE_URL tanımlı değil — prod’da Constants.expoConfig.extra.supabaseUrl boş olur.'
    );
  }

  return {
    ...config,
    extra: {
      ...config.extra,
      supabaseUrl: url,
      APP_ENV: process.env.APP_ENV ?? 'device',
      API_BASE: process.env.API_BASE ?? '',
      OCR_MVP_BASE: process.env.OCR_MVP_BASE ?? process.env.EXPO_PUBLIC_OCR_BASE ?? '',
      EXPO_PUBLIC_DEVICE_IP: process.env.EXPO_PUBLIC_DEVICE_IP ?? '',
    },
  };
};
