import type { Limit } from './limits'

/**
 * The only upstream calls the console may relay. The demo is public: the
 * proxy is not a way into the hub or the simulator, just into these screens.
 * Every write names the rate limit it spends.
 */
type Method = 'GET' | 'POST' | 'PUT'

export interface Rule {
  method: Method
  path: RegExp
  limit?: Limit
}

const CODE = '[a-z][a-z0-9-]{1,31}'

export const HUB_ROUTES: readonly Rule[] = [
  { method: 'GET', path: /^api\/(journal|channels|overview|failed-messages|orders)$/ },
  {
    method: 'POST',
    path: new RegExp(`^api/channels/${CODE}/(pause|resume|reconcile)$`),
    limit: 'operation',
  },
  { method: 'POST', path: /^api\/failed-messages\/replay$/, limit: 'operation' },
  { method: 'POST', path: /^api\/failed-messages\/\d{1,18}\/replay$/, limit: 'operation' },
  { method: 'POST', path: /^api\/incident-analyses$/, limit: 'analysis' },
  { method: 'POST', path: /^api\/incident-analyses\/actions$/, limit: 'operation' },
]

export const SIMULATOR_ROUTES: readonly Rule[] = [
  { method: 'GET', path: /^control\/marketplaces$/ },
  {
    method: 'PUT',
    path: new RegExp(`^control/marketplaces/${CODE}/preset/(calm|busy|storm)$`),
    limit: 'chaos',
  },
  {
    method: 'POST',
    path: new RegExp(`^control/marketplaces/${CODE}/generate$`),
    limit: 'generate',
  },
]

export function match(
  rules: readonly Rule[],
  method: string,
  segments: readonly string[],
): Rule | null {
  if (segments.some((s) => s === '' || s === '.' || s === '..' || s.includes('/'))) return null
  const path = segments.join('/')
  return rules.find((rule) => rule.method === method && rule.path.test(path)) ?? null
}

export function isAllowed(
  rules: readonly Rule[],
  method: string,
  segments: readonly string[],
): boolean {
  return match(rules, method, segments) !== null
}
