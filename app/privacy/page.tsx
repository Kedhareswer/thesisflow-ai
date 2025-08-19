"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-neutral max-w-none dark:prose-invert">
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          <h3>1. Overview</h3>
          <p>
            We respect your privacy. This policy explains what data we collect, how we use it, and your choices.
          </p>
          <h3>2. Data We Collect</h3>
          <p>
            Account details (name, email), product usage, and preferences you share (e.g., marketing opt-in).
          </p>
          <h3>3. How We Use Data</h3>
          <p>
            To provide and improve the platform, communicate with you, and personalize your experience.
          </p>
          <h3>4. Your Choices</h3>
          <ul>
            <li>You can opt in/out of marketing emails anytime.</li>
            <li>You can request deletion or export of your data subject to applicable laws.</li>
          </ul>
          <h3>5. Security</h3>
          <p>
            We use industry-standard measures to protect your data.
          </p>
          <p className="mt-8 text-sm">
            See our {" "}
            <Link href="/terms" className="text-primary underline-offset-4 hover:underline">Terms of Service</Link> or return to the {" "}
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">Sign Up</Link> page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
