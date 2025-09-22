import Example from "@/components/ui/cookies";

export default function DemoCookiePanel() {
  return (
    <main className="min-h-screen grid place-items-center bg-background text-foreground p-8">
      <div className="m-auto max-w-xl text-center">
        <h1 className="text-2xl font-semibold mb-2">Cookies Notice — Simple Card</h1>

        <p className="text-muted-foreground mb-8">
          This demo renders a minimal cookie notice card that fits into any layout. It uses theme-aware
          shadcn design tokens and works in both light and dark modes.
        </p>
      </div>

      <Example />
    </main>
  );
}
