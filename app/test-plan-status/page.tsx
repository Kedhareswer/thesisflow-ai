"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSupabaseAuth } from "@/components/supabase-auth-provider"
import { useUserPlan } from "@/hooks/use-user-plan"
import { PlanStatus } from "@/components/ui/plan-status"

export default function TestPlanStatus() {
  const { user, session } = useSupabaseAuth()
  const { toast } = useToast()
  const { incrementUsage, refreshPlanData, planData, loading } = useUserPlan()
  const [testing, setTesting] = useState(false)

  const testIncrementUsage = async (feature: string) => {
    if (!session?.access_token) {
      toast({
        title: "Authentication required",
        description: "Please log in to test usage increment",
        variant: "destructive",
      })
      return
    }

    setTesting(true)

    try {
      const success = await incrementUsage(feature)
      
      if (success) {
        toast({
          title: "Usage Incremented Successfully",
          description: `Successfully incremented usage for ${feature}`,
        })
      } else {
        toast({
          title: "Usage Increment Failed",
          description: "Failed to increment usage or limit exceeded",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Test increment error:", error)
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const testRefreshPlanData = async () => {
    setTesting(true)
    
    try {
      await refreshPlanData()
      toast({
        title: "Plan Data Refreshed",
        description: "Plan status has been refreshed",
      })
    } catch (error) {
      console.error("Refresh error:", error)
      toast({
        title: "Refresh Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Plan Status Real-Time Test</CardTitle>
          <CardDescription>
            Test the real-time plan status updates and usage tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold">User Information:</h3>
            <p className="text-sm text-gray-600">User ID: {user?.id || "Not logged in"}</p>
            <p className="text-sm text-gray-600">Session: {session ? "Active" : "No session"}</p>
            <p className="text-sm text-gray-600">Loading: {loading ? "Yes" : "No"}</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Current Plan Data:</h3>
            {planData ? (
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Plan Type:</strong> {planData.plan?.plan_type || "free"}
                </p>
                <p className="text-sm">
                  <strong>Status:</strong> {planData.plan?.status || "active"}
                </p>
                <p className="text-sm">
                  <strong>Usage Items:</strong> {planData.usage?.length || 0}
                </p>
                <div className="space-y-1">
                  {planData.usage?.map((item, index) => (
                    <div key={index} className="text-xs bg-gray-100 p-2 rounded">
                      <strong>{item.feature}:</strong> {item.usage_count}/{item.limit_count} 
                      (Remaining: {item.remaining}, Unlimited: {item.is_unlimited ? "Yes" : "No"})
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No plan data available</p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Test Actions:</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => testIncrementUsage('literature_searches')}
                disabled={testing || !session}
                className="w-full"
              >
                {testing ? "Testing..." : "Test Literature Searches"}
              </Button>

              <Button
                onClick={() => testIncrementUsage('ai_generations')}
                disabled={testing || !session}
                className="w-full"
              >
                {testing ? "Testing..." : "Test AI Generations"}
              </Button>

              <Button
                onClick={() => testIncrementUsage('document_uploads')}
                disabled={testing || !session}
                className="w-full"
              >
                {testing ? "Testing..." : "Test Document Uploads"}
              </Button>

              <Button
                onClick={() => testIncrementUsage('team_collaboration')}
                disabled={testing || !session}
                className="w-full"
              >
                {testing ? "Testing..." : "Test Team Collaboration"}
              </Button>
            </div>

            <Button
              onClick={testRefreshPlanData}
              disabled={testing || !session}
              variant="outline"
              className="w-full"
            >
              {testing ? "Refreshing..." : "Manual Refresh Plan Data"}
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Live Plan Status Component:</h3>
            <PlanStatus showDetails={true} />
          </div>

          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Test Instructions:</h3>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. Click any "Test" button to increment usage for that feature</li>
              <li>2. Watch the Plan Status component update in real-time</li>
              <li>3. Use the refresh button in the Plan Status component</li>
              <li>4. Check browser console for real-time subscription logs</li>
              <li>5. Try reaching usage limits to test limit enforcement</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 