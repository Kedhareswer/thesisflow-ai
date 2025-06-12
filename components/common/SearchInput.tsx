"use client"

import { useState, useCallback } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  placeholder?: string
  onSearch: (query: string) => void
  onClear?: () => void
  className?: string
  autoFocus?: boolean
  buttonText?: string
  showButton?: boolean
}

export function SearchInput({
  placeholder = "Search...",
  onSearch,
  onClear,
  className,
  autoFocus = false,
  buttonText = "Search",
  showButton = false,
}: SearchInputProps) {
  const [query, setQuery] = useState("")

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      onSearch(query)
    }
  }, [query, onSearch])

  const handleClear = useCallback(() => {
    setQuery("")
    onClear?.()
  }, [onClear])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
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
      {showButton && (
        <Button onClick={handleSearch} disabled={!query.trim()} type="button">
          <Search className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      )}
    </div>
  )
}
