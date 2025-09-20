"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { useToast } from "@/hooks/use-toast"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [agreePolicies, setAgreePolicies] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const { signUp } = useSupabaseAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      })
      return
    }

    if (!agreePolicies) {
      toast({
        title: "Please accept the terms",
        description: "You must agree to the Terms of Service and Privacy Policy to create an account.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      await signUp(email, password, {
        full_name: name,
        email: email,
        accepted_terms: agreePolicies,
        accepted_terms_at: new Date().toISOString(),
        email_marketing_opt_in: marketingOptIn,
      })
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      })
    } catch (error) {
      toast({
        title: "Sign up failed",
        description: "Please try again with different credentials.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join the ML Research Platform to start your research journey</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {password && password.length < 6 && (
                <p className="text-xs text-red-500">Password must be at least 6 characters</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agreePolicies"
                  checked={agreePolicies}
                  onCheckedChange={(v) => setAgreePolicies(Boolean(v))}
                  className="mt-0.5"
                />
                <Label htmlFor="agreePolicies" className="leading-relaxed font-normal text-sm text-muted-foreground">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary font-medium underline-offset-4 hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-primary font-medium underline-offset-4 hover:underline">Privacy Policy</Link>.
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="marketingOptIn"
                  checked={marketingOptIn}
                  onCheckedChange={(v) => setMarketingOptIn(Boolean(v))}
                  className="mt-0.5"
                />
                <Label htmlFor="marketingOptIn" className="leading-relaxed font-normal text-sm text-muted-foreground">
                  Send me research tips, product updates, and special offers.
                </Label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !agreePolicies}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
