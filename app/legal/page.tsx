import Link from "next/link";

export default function LegalPage() {
  return (
    <div className="bg-background">
      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono text-foreground">Legal</h1>
          <p className="text-muted-foreground font-mono mt-3 text-lg">Policies and terms for ThesisFlow-AI.</p>
        </div>
        <div className="space-y-4 font-mono">
          <p>Read our <Link href="/terms" className="text-[#FF6B2C]">Terms of Service</Link> and <Link href="/privacy" className="text-[#FF6B2C]">Privacy Policy</Link>. Security details are available at <Link href="/.well-known/security.txt" className="text-[#FF6B2C]">/.well-known/security.txt</Link>.</p>
          <p>If you have questions, contact us at <a className="text-[#FF6B2C]" href="mailto:legal@thesisflow-ai.com">legal@thesisflow-ai.com</a>.</p>
        </div>
      </section>
    </div>
  );
}
