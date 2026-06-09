/**
 * Tab bar yardimcilari — expo-router descriptor'lerinden label/visibility
 * cikarir.
 */

/** Route + options'tan en uygun goruntu metnini secer. */
export function resolveLabel(route: any, options: any): string {
  if (typeof options.tabBarLabel === 'string') return options.tabBarLabel;
  if (typeof options.title       === 'string') return options.title;
  return route.name;
}

/** Routes ile gosterilmemesi gereken (eslemeyen) butonlari ayirir. */
export function isHiddenRoute(options: any): boolean {
  if (options?.href === null || options?.tabBarButton === null) return true;
  // Tabs without a tabBarIcon defined are intentionally hidden (e.g. Marktplatz)
  if (typeof options?.tabBarIcon !== 'function') return true;
  return false;
}
