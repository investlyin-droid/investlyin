/** Opt-in auth debug logs. Set NEXT_PUBLIC_DEBUG_AUTH=true to see OAuth/redirect flow logs. */
const isAuthDebug =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true';

export function authDebugLog(...args: unknown[]) {
  if (isAuthDebug) console.log('[auth]', ...args);
}

export function authDebugWarn(...args: unknown[]) {
  if (isAuthDebug) console.warn('[auth]', ...args);
}
