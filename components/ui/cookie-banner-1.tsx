"use client";

import { useEffect, useRef, useState } from "react";
import { Cookie, Shield, Info, X, ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Prefs = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

interface CookiePanelProps {
  title?: string;
  message?: string;
  acceptText?: string;
  customizeText?: string;
  icon?: "cookie" | "shield" | "info";
  className?: string;
  privacyHref?: string;
  termsHref?: string;
}

const CookiePanel = (props: CookiePanelProps) => {
  const {
    title = "This site uses cookies",
    message = "We use cookies to enhance your experience.",
    acceptText = "Accept all",
    customizeText = "Customize",
    icon = "cookie",
    className,
    privacyHref = "/privacy",
    termsHref = "/terms",
  } = props;

  const [visible, setVisible] = useState(false);
  const [render, setRender] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  const prefsRef = useRef<HTMLDivElement | null>(null);
  const [prefsHeight, setPrefsHeight] = useState<number>(0);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem("cookie-consent")
        : null;

    if (!stored) {
      setRender(true);
      requestAnimationFrame(() => setVisible(true));
    }

    const storedPrefs = localStorage.getItem("cookie-preferences");
    if (storedPrefs) {
      try {
        const parsed = JSON.parse(storedPrefs) as Prefs;
        // Ensure `necessary` is always true; put it last to avoid duplicate-key lint
        setPrefs({ ...parsed, necessary: true });
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (showPrefs && prefsRef.current) {
      const h = prefsRef.current.scrollHeight;
      setPrefsHeight(h);
    } else {
      setPrefsHeight(0);
    }
  }, [showPrefs, prefs]);

  const closeWithExit = (val?: "true" | "false") => {
    if (val) localStorage.setItem("cookie-consent", val);
    setVisible(false);
    setTimeout(() => setRender(false), 300);
  };

  const savePreferences = () => {
    localStorage.setItem("cookie-preferences", JSON.stringify(prefs));
    localStorage.setItem("cookie-consent", "true");
    setShowPrefs(false);

    setVisible(false);
    setTimeout(() => setRender(false), 300);
  };

  if (!render) return null;

  const IconEl =
    icon === "shield" ? Shield : icon === "info" ? Info : Cookie;

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
        className={cn(
          "mt-0.5 inline-flex size-5 items-center justify-center rounded border",
          locked
            ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
            : "bg-background border-border hover:bg-accent cursor-pointer"
        )}
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
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className={cn(
        "fixed right-4 bottom-4 md:right-6 md:bottom-6",
        "z-50 w-[360px] max-w-[90vw]"
      )}
    >
      <div
        className={cn(
          "relative border border-border/70 rounded-xl bg-card/95 text-card-foreground shadow-xl backdrop-blur",
          "p-4 flex flex-col gap-3",
          visible
            ? cn("animate-in", "fade-in", "slide-in-from-bottom-8")
            : cn("animate-out", "fade-out", "slide-out-to-bottom-8"),
          "duration-300 ease-out",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <IconEl className="size-5" aria-hidden="true" />
          </span>

          <h2 className="text-sm font-semibold leading-5">{title}</h2>

          <button
            type="button"
            onClick={() => closeWithExit()}
            className="ml-auto inline-flex size-8 items-center justify-center rounded-md hover:bg-foreground/5 cursor-pointer"
            aria-label="Close cookie banner"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          {message} See our{" "}
          <a
            href={privacyHref}
            className="underline underline-offset-4 hover:text-foreground cursor-pointer"
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a
            href={termsHref}
            className="underline underline-offset-4 hover:text-foreground cursor-pointer"
          >
            Terms & Conditions
          </a>
          .
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrefs((p) => !p)}
            className={cn(
              "px-3 py-1.5 rounded-md border border-border/70 cursor-pointer",
              "bg-muted text-muted-foreground text-xs",
              "hover:bg-muted/80 transition-colors flex items-center gap-1"
            )}
            aria-expanded={showPrefs}
            aria-controls="cookie-preferences-inline"
          >
            {customizeText}
            {showPrefs ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </button>

          <button
            type="button"
            onClick={() => closeWithExit("true")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs cursor-pointer",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors"
            )}
          >
            {acceptText}
          </button>
        </div>

        <div
          id="cookie-preferences-inline"
          ref={prefsRef}
          style={{ height: prefsHeight ? `${prefsHeight}px` : 0 }}
          className={cn(
            "overflow-hidden transition-[height] duration-300 ease-out will-change-[height]"
          )}
        >
          {showPrefs && (
            <div className="mt-2 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <PrefRow
                title="Strictly necessary"
                desc="Required for site functionality."
                field="necessary"
                locked
              />
              
              <PrefRow
                title="Functional"
                desc="Remembers your preferences."
                field="functional"
              />

              <PrefRow
                title="Analytics"
                desc="Helps us improve the site."
                field="analytics"
              />

              <PrefRow
                title="Marketing"
                desc="Personalized ads."
                field="marketing"
              />

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
    </div>
  );
};

export { CookiePanel };
