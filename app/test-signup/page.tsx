"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function TestSignupPage() {
  const [email, setEmail] = useState("test@example.com")
  const [password, setPassword] = useState("testpassword123")
  const [name, setName] = useState("Test User")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const testManualFunction = async () => {
    setLoading(true)
    try {
      // Test the manual RPC function
      const testId = crypto.randomUUID()
      const { error } = await supabase.rpc('create_user_profile_and_plan', {
        user_id: testId,
        user_email: 'test.manual@example.com',
        user_full_name: 'Test Manual User'
      })

      if (error) {
        toast({
          title: "RPC Test Failed",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "RPC Test Successful",
          description: "Manual function works!",
        })
      }
    } catch (error) {
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testSignup = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            email: email,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        console.log("Auth signup successful, creating user profile and plan...")
        
        const { error: profileError } = await supabase.rpc('create_user_profile_and_plan', {
          user_id: data.user.id,
          user_email: email,
          user_full_name: name
        })
        
        if (profileError) {
          console.error('RPC failed, trying API fallback:', profileError)
          
          // Fallback to API route
          const response = await fetch('/api/auth/create-user-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: data.user.id,
              email: email,
              full_name: name
            })
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            console.error('API fallback failed:', errorData)
            toast({
              title: "Profile Creation Failed",
              description: "Signup succeeded but profile creation failed",
              variant: "destructive",
            })
          } else {
            console.log("User profile and plan created via API fallback")
            toast({
              title: "Signup Successful",
              description: "Account created with profile via API fallback",
            })
          }
        } else {
          console.log("User profile and plan created successfully via RPC")
          toast({
            title: "Signup Successful",
            description: "Account created with profile via RPC",
          })
        }
      }
    } catch (error) {
      console.error("Signup error:", error)
      toast({
        title: "Signup Failed",
        description: error instanceof Error ? error.message : "Failed to sign up",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Test Signup Fix</CardTitle>
          <CardDescription>Test the manual user creation function</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={testManualFunction} 
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Test RPC Function
            </Button>
            <Button 
              onClick={testSignup} 
              disabled={loading}
              className="flex-1"
            >
              Test Full Signup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 