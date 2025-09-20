"use client";
import React, { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  CONSENT_VERSION,
  CONSENT_COOKIE_NAME,
  PREFS_COOKIE_NAME,
  VERSION_COOKIE_NAME,
  DEFAULT_COOKIE_PREFS,
  normalizePrefs,
} from "@/lib/cookie-consent";

type Prefs = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_COOKIE_PREFS });

  // Helpers to set/get HTTP cookies (SSR-friendly checks in future requests)
  const cookieAttrs = (() => {
    const base = ["Path=/", "SameSite=Lax", "Max-Age=31536000"]; // 1 year
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      base.push("Secure");
    }
    return base.join("; ");
  })();

  const setCookie = (name: string, value: string) => {
    try {
      document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ${cookieAttrs}`;
    } catch {}
  };

  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()\[\]\\\/+^])/g, "\\$1")}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  };

  useEffect(() => {
    setMounted(true);
    try {
      // Prefer HTTP cookies so SSR can honor them on next requests
      const consentCookie = getCookie(CONSENT_COOKIE_NAME);
      const prefsCookie = getCookie(PREFS_COOKIE_NAME);
      const versionCookie = getCookie(VERSION_COOKIE_NAME);
      if (prefsCookie) {
        try {
          const parsed = JSON.parse(prefsCookie) as Partial<Prefs>;
          setPrefs((p) => normalizePrefs({ ...p, ...parsed }));
        } catch {}
      }

      const consentLS = localStorage.getItem("cookie-consent");
      const prefsLS = localStorage.getItem("cookie-preferences");
      if (!prefsCookie && prefsLS) {
        try {
          const parsed = JSON.parse(prefsLS) as Partial<Prefs>;
          setPrefs((p) => normalizePrefs({ ...p, ...parsed }));
        } catch {}
      }

      const hasConsent = (consentCookie === "true" || consentLS === "true") && versionCookie === CONSENT_VERSION;
      if (!hasConsent) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const acceptAll = () => {
    try {
      const all = { necessary: true, functional: true, analytics: true, marketing: true };
      localStorage.setItem("cookie-consent", "true");
      localStorage.setItem("cookie-preferences", JSON.stringify(all));
      setCookie(CONSENT_COOKIE_NAME, "true");
      setCookie(PREFS_COOKIE_NAME, JSON.stringify(all));
      setCookie(VERSION_COOKIE_NAME, CONSENT_VERSION);
    } finally {
      setVisible(false);
    }
  };

  const savePreferences = () => {
    try {
      localStorage.setItem("cookie-consent", "true");
      localStorage.setItem("cookie-preferences", JSON.stringify(prefs));
      setCookie(CONSENT_COOKIE_NAME, "true");
      setCookie(PREFS_COOKIE_NAME, JSON.stringify(prefs));
      setCookie(VERSION_COOKIE_NAME, CONSENT_VERSION);
    } finally {
      setVisible(false);
    }
  };

  const rejectAll = () => {
    try {
      const none = { necessary: true, functional: false, analytics: false, marketing: false };
      localStorage.setItem("cookie-consent", "true");
      localStorage.setItem("cookie-preferences", JSON.stringify(none));
      setCookie(CONSENT_COOKIE_NAME, "true");
      setCookie(PREFS_COOKIE_NAME, JSON.stringify(none));
      setCookie(VERSION_COOKIE_NAME, CONSENT_VERSION);
      setPrefs(none);
    } finally {
      setVisible(false);
    }
  };

  if (!mounted || !visible) return null;

  const PrefRow = ({
    title,
    desc,
    field,
    locked,
  }: {
    title: string;
    desc: string;
    field: keyof Prefs;
    locked?: boolean;
  }) => (
    <div className="flex items-start gap-2 p-2 rounded-lg border border-border">
      <button
        type="button"
        disabled={locked}
        onClick={() => !locked && setPrefs((p) => ({ ...p, [field]: !p[field] }))}
        className={
          "mt-0.5 inline-flex size-5 items-center justify-center rounded border " +
          (locked
            ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
            : "bg-background border-border hover:bg-accent cursor-pointer")
        }
        aria-pressed={prefs[field]}
        aria-label={`${title} cookie preference`}
      >
        {prefs[field] && <Check className="size-4" />}
      </button>

      <div className="flex-1">
        <div className="text-xs font-medium">
          {title} {locked && <span className="text-[10px] text-muted-foreground">(required)</span>}
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-50 w-[22rem] max-w-[90vw]">
      <div className="relative border border-border/70 rounded-xl bg-card/95 text-card-foreground shadow-xl backdrop-blur p-4 flex flex-col gap-3">
        <div className="flex items-center justify-center relative w-full gap-2 pb-1">
          <img
            className="absolute -top-12 h-16 w-16 rounded-full object-cover ring-1 ring-border"
            src="https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=160&q=80"
            alt="cookies"
            loading="lazy"
            decoding="async"
          />
          <h2 className="text-card-foreground text-xl font-medium text-left w-full pt-3">
            Your privacy is important to us
          </h2>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          We use cookies to measure and improve our product, assist campaigns, and personalize content. See our
          {" "}
          <a href="/privacy" className="underline underline-offset-4 hover:text-foreground">Privacy Policy</a>.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrefs((p) => !p)}
            className="px-3 py-1.5 rounded-md border border-border/70 bg-muted text-muted-foreground text-xs hover:bg-muted/80 transition-colors flex items-center gap-1 cursor-pointer"
            aria-expanded={showPrefs}
            aria-controls="cookie-preferences-inline"
          >
            Customize {showPrefs ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
          <button
            type="button"
            onClick={rejectAll}
            className="px-3 py-1.5 rounded-md text-xs border border-border/70 bg-background hover:bg-accent text-foreground/80 cursor-pointer"
          >
            Reject all
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            Accept all
          </button>
        </div>

        {showPrefs && (
          <div id="cookie-preferences-inline" className="mt-1 flex flex-col gap-2">
            <PrefRow title="Strictly necessary" desc="Required for site functionality." field="necessary" locked />
            <PrefRow title="Functional" desc="Remembers your preferences." field="functional" />
            <PrefRow title="Analytics" desc="Helps us improve the site." field="analytics" />
            <PrefRow title="Marketing" desc="Personalized ads." field="marketing" />
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowPrefs(false)}
                className="px-2.5 py-1 rounded-md border border-border bg-muted text-muted-foreground text-xs hover:bg-muted/80 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePreferences}
                className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 cursor-pointer"
              >
                Save preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
