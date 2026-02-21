/** Shared auth cookie so middleware and OAuth redirect handlers stay in sync. */
export const AUTH_COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export function setAuthCookie(token: string): void {
  if (typeof document === 'undefined') return;
  const isProduction = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const secure = isProduction ? '; Secure' : '';
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
}
