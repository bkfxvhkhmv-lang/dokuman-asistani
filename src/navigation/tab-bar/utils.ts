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
  return options?.href === null || options?.tabBarButton === null;
}
