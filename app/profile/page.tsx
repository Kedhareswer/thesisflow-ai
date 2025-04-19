import type { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserProfile } from "@/components/profile/user-profile"
import { SubscriptionManagement } from "@/components/profile/subscription-management"
import { UsageDashboard } from "@/components/analytics/usage-dashboard"
import { FeatureComparison } from "@/components/premium/feature-comparison"

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your account and subscription",
}

export default function ProfilePage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Account Settings</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 mt-4">
          <UserProfile />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4 mt-4">
          <SubscriptionManagement />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4 mt-4">
          <UsageDashboard />
        </TabsContent>

        <TabsContent value="plans" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Compare our plans and choose the one that fits your needs</CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureComparison />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
