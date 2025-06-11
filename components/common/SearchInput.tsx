"use client"

import { useState, useCallback, useMemo } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/lib/hooks/useDebounce"

interface SearchInputProps {
  placeholder?: string
  onSearch: (query: string) => void
  onClear?: () => void
  debounceMs?: number
  className?: string
  autoFocus?: boolean
}

export function SearchInput({
  placeholder = "Search...",
  onSearch,
  onClear,
  debounceMs = 300,
  className,
  autoFocus = false,
}: SearchInputProps) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, debounceMs)

  // Trigger search when debounced query changes
  useMemo(() => {
    onSearch(debouncedQuery)
  }, [debouncedQuery, onSearch])

  const handleClear = useCallback(() => {
    setQuery("")
    onClear?.()
  }, [onClear])

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 pr-10"
        autoFocus={autoFocus}
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
