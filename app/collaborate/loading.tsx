import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { TeamCardSkeleton, ChatMessageSkeleton, MemberCardSkeleton, Skeleton } from "@/components/ui/skeleton-loader"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1 space-y-6">
            {/* Create Team Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>

            {/* Search Skeleton */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>

            {/* Teams List Skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <TeamCardSkeleton key={i} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Skeleton */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Tabs Skeleton */}
                <div className="space-y-6">
                  <div className="grid w-full grid-cols-3 bg-muted rounded-lg p-1">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-8 rounded-md" />
                    ))}
                  </div>

                  {/* Chat Content Skeleton */}
                  <div className="border rounded-lg h-96 flex flex-col">
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <ChatMessageSkeleton key={i} />
                      ))}
                    </div>
                    <Separator />
                    <div className="p-4">
                      <div className="flex gap-2">
                        <Skeleton className="flex-1 h-10" />
                        <Skeleton className="h-10 w-10" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="fixed bottom-6 right-6">
        <Card className="p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
            <span className="text-sm text-muted-foreground">Loading collaboration workspace...</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
