import { cookies } from "next/headers";
import {
  CONSENT_VERSION,
  CONSENT_COOKIE_NAME,
  PREFS_COOKIE_NAME,
  VERSION_COOKIE_NAME,
  DEFAULT_COOKIE_PREFS,
  normalizePrefs,
  type CookiePrefs,
} from "@/lib/cookie-consent";

export type CookieConsentState = {
  hasConsent: boolean;
  version: string | null;
  prefs: CookiePrefs;
};

export function readCookieConsent(): CookieConsentState {
  const store = cookies();
  const consentVal = store.get(CONSENT_COOKIE_NAME)?.value ?? null;
  const versionVal = store.get(VERSION_COOKIE_NAME)?.value ?? null;
  const prefsRaw = store.get(PREFS_COOKIE_NAME)?.value ?? null;

  let prefs = DEFAULT_COOKIE_PREFS;
  if (prefsRaw) {
    try {
      const parsed = JSON.parse(prefsRaw) as Partial<CookiePrefs>;
      prefs = normalizePrefs(parsed);
    } catch {
      // fall back to defaults
      prefs = DEFAULT_COOKIE_PREFS;
    }
  }

  const hasConsent = consentVal === "true" && versionVal === CONSENT_VERSION;
  return { hasConsent, version: versionVal, prefs };
}

export function hasAnalyticsConsent(): boolean {
  const { hasConsent, prefs } = readCookieConsent();
  return hasConsent && !!prefs.analytics;
}

export function hasMarketingConsent(): boolean {
  const { hasConsent, prefs } = readCookieConsent();
  return hasConsent && !!prefs.marketing;
}

export function shouldShowCookieBanner(): boolean {
  const { hasConsent } = readCookieConsent();
  return !hasConsent;
}
