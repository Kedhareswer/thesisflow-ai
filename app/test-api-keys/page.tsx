"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"

export default function TestApiKeys() {
  const { user, session } = useSupabaseAuth()
  const { toast } = useToast()
  const [testKey, setTestKey] = useState("")
  const [loading, setLoading] = useState(false)

  const testApiKeySaving = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test API key saving",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Test with a dummy API key
      const response = await fetch("/api/user-api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          provider: "groq",
          apiKey: "gsk_test_key_for_testing_purposes_only",
          testKey: false,
        }),
      })

      const data = await response.json()
      console.log("API Response:", data)

      if (response.ok) {
        toast({
          title: "API Key Test Success",
          description: data.message || "API key saved successfully",
        })
      } else {
        toast({
          title: "API Key Test Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Test error:", error)
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testApiKeyValidation = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test API key validation",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Test with a dummy API key
      const response = await fetch("/api/user-api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          provider: "groq",
          apiKey: "gsk_test_key_for_testing_purposes_only",
          testKey: true,
        }),
      })

      const data = await response.json()
      console.log("Validation Response:", data)

      if (response.ok) {
        toast({
          title: "Validation Test Success",
          description: data.message || "API key validation successful",
        })
      } else {
        toast({
          title: "Validation Test Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Validation test error:", error)
      toast({
        title: "Validation Test Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testGetApiKeys = async () => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test API key retrieval",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/user-api-keys", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()
      console.log("Get API Keys Response:", data)

      if (response.ok) {
        toast({
          title: "Get API Keys Success",
          description: `Found ${data.apiKeys?.length || 0} API keys`,
        })
      } else {
        toast({
          title: "Get API Keys Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Get API keys error:", error)
      toast({
        title: "Get API Keys Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>API Key Saving Test</CardTitle>
          <CardDescription>
            Test the API key saving functionality to ensure it's working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>User ID: {user?.id || "Not logged in"}</Label>
            <Label>Session: {session ? "Active" : "No session"}</Label>
          </div>

          <div className="space-y-4">
            <Button
              onClick={testApiKeySaving}
              disabled={loading || !session}
              className="w-full"
            >
              {loading ? "Testing..." : "Test API Key Saving"}
            </Button>

            <Button
              onClick={testApiKeyValidation}
              disabled={loading || !session}
              variant="outline"
              className="w-full"
            >
              {loading ? "Testing..." : "Test API Key Validation"}
            </Button>

            <Button
              onClick={testGetApiKeys}
              disabled={loading || !session}
              variant="outline"
              className="w-full"
            >
              {loading ? "Testing..." : "Test Get API Keys"}
            </Button>
          </div>

          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <p className="text-sm text-gray-600">
              Check the browser console for detailed response data
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 