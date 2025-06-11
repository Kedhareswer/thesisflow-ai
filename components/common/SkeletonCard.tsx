import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface SkeletonCardProps {
  showHeader?: boolean
  showFooter?: boolean
  lines?: number
  className?: string
}

export function SkeletonCard({ showHeader = true, showFooter = false, lines = 3, className }: SkeletonCardProps) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </CardContent>
      {showFooter && (
        <div className="p-6 pt-0">
          <Skeleton className="h-9 w-24" />
        </div>
      )}
    </Card>
  )
}

export function SkeletonList({ count = 3, ...props }: SkeletonCardProps & { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} {...props} />
      ))}
    </div>
  )
}
