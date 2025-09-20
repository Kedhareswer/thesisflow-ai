export type CookiePrefs = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export const CONSENT_VERSION = "1";
export const CONSENT_COOKIE_NAME = "tf_cookie_consent";
export const PREFS_COOKIE_NAME = "tf_cookie_prefs";
export const VERSION_COOKIE_NAME = "tf_cookie_version";

export const DEFAULT_COOKIE_PREFS: CookiePrefs = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export function normalizePrefs(p?: Partial<CookiePrefs> | null): CookiePrefs {
  if (!p) return { ...DEFAULT_COOKIE_PREFS };
  return {
    ...DEFAULT_COOKIE_PREFS,
    ...p,
    necessary: true, // always enforced
  };
}
