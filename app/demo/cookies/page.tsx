import { CookiePanel } from "@/components/ui/cookie-banner-1";

export default function DemoCookiePanel() {
  return (
    <main className="min-h-screen grid place-items-center bg-background text-foreground p-8">
      <div className="m-auto max-w-xl text-center">
        <h1 className="text-2xl font-semibold mb-2">Cookie Panel — Toast with Preferences</h1>

        <p className="text-muted-foreground mb-8">
          This demo shows the compact, bottom‑right floating cookie banner. 
          Click <strong>Customize</strong> to expand and adjust your cookie preferences inline — no modal needed.
        </p>
      </div>

      <CookiePanel />
    </main>
  );
}
