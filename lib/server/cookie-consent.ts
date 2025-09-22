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

export async function readCookieConsent(): Promise<CookieConsentState> {
  const store = await cookies();
  const consentVal = store.get(CONSENT_COOKIE_NAME)?.value ?? null;
  const versionVal = store.get(VERSION_COOKIE_NAME)?.value ?? null;
  const prefsRaw = store.get(PREFS_COOKIE_NAME)?.value ?? null;

  let prefs = DEFAULT_COOKIE_PREFS;
  if (prefsRaw) {
    try {
      // URL-decode the cookie value before parsing JSON
      const decodedPrefs = decodeURIComponent(prefsRaw);
      const parsed = JSON.parse(decodedPrefs) as Partial<CookiePrefs>;
      prefs = normalizePrefs(parsed);
    } catch {
      // fall back to defaults if decoding or parsing fails
      prefs = DEFAULT_COOKIE_PREFS;
    }
  }

  const hasConsent = consentVal === "true" && versionVal === CONSENT_VERSION;
  return { hasConsent, version: versionVal, prefs };
}

export async function hasAnalyticsConsent(): Promise<boolean> {
  const { hasConsent, prefs } = await readCookieConsent();
  return hasConsent && !!prefs.analytics;
}

export async function hasMarketingConsent(): Promise<boolean> {
  const { hasConsent, prefs } = await readCookieConsent();
  return hasConsent && !!prefs.marketing;
}

export async function shouldShowCookieBanner(): Promise<boolean> {
  const { hasConsent } = await readCookieConsent();
  return !hasConsent;
}
