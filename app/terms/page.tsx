"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-neutral max-w-none dark:prose-invert">
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          <h3>1. Acceptance of Terms</h3>
          <p>
            By creating an account or using our services, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.
          </p>
          <h3>2. Use of Service</h3>
          <p>
            You agree to use the platform responsibly and comply with all applicable laws. We may update these terms periodically.
          </p>
          <h3>3. Accounts</h3>
          <p>
            You are responsible for safeguarding your account. Notify us immediately upon any unauthorized use.
          </p>
          <h3>4. Intellectual Property</h3>
          <p>
            All product content, features, and branding are protected by applicable IP laws.
          </p>
          <h3>5. Termination</h3>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
          <p className="mt-8 text-sm">
            Questions? See our <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">Privacy Policy</Link> or return to the {" "}
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">Sign Up</Link> page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
