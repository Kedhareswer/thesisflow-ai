"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function PasswordResetForm() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { resetPassword, isLoading } = useSupabaseAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await resetPassword(email)
      setIsSubmitted(true)
    } catch (error) {
      // Error is handled by the auth provider
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>We've sent a password reset link to {email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the link in the email to reset your password. If you don't see it, check your spam folder.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>Enter your email address and we'll send you a link to reset your password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
