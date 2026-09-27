/**
 * The only upstream calls the console may relay. The demo is public: the
 * proxy is not a way into the hub or the simulator, just into these screens.
 */
type Method = 'GET' | 'POST' | 'PUT'

interface Rule {
  method: Method
  path: RegExp
}

const CODE = '[a-z][a-z0-9-]{1,31}'

export const HUB_ROUTES: readonly Rule[] = [
  { method: 'GET', path: /^api\/(journal|channels|overview|failed-messages|orders)$/ },
  { method: 'POST', path: new RegExp(`^api/channels/${CODE}/(pause|resume|reconcile)$`) },
  { method: 'POST', path: /^api\/failed-messages\/replay$/ },
  { method: 'POST', path: /^api\/failed-messages\/\d{1,18}\/replay$/ },
  { method: 'POST', path: /^api\/incident-analyses(\/actions)?$/ },
]

export const SIMULATOR_ROUTES: readonly Rule[] = [
  { method: 'GET', path: /^control\/marketplaces$/ },
  { method: 'PUT', path: new RegExp(`^control/marketplaces/${CODE}/preset/(calm|busy|storm)$`) },
  { method: 'POST', path: new RegExp(`^control/marketplaces/${CODE}/generate$`) },
]

export function isAllowed(
  rules: readonly Rule[],
  method: string,
  segments: readonly string[],
): boolean {
  if (segments.some((s) => s === '' || s === '.' || s === '..' || s.includes('/'))) return false
  const path = segments.join('/')
  return rules.some((rule) => rule.method === method && rule.path.test(path))
}
