"use client"

import { useState, useRef, useCallback } from "react"
import type { VectorSearchResult } from "../vectors"

export interface UseVectorSearchOptions {
  apiUrl: string
  apiKey: string
  appId: string
  limit?: number
  filter?: Record<string, unknown>
  debounceMs?: number
}

export interface UseVectorSearchReturn {
  results: VectorSearchResult[]
  search: (query: string) => void
  isSearching: boolean
  error: Error | null
}

export function useVectorSearch(collection: string, options: UseVectorSearchOptions): UseVectorSearchReturn {
  const [results, setResults] = useState<VectorSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef(0)

  const doSearch = useCallback(async (query: string) => {
    const id = ++latestRef.current
    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(`${options.apiUrl}/apps/${options.appId}/vectors/${encodeURIComponent(collection)}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
          query,
          limit: options.limit || 10,
          filter: options.filter,
        }),
      })

      if (!response.ok) {
        throw new Error(`Search error: ${response.status}`)
      }

      const data = await response.json() as { results: VectorSearchResult[] }
      if (id === latestRef.current) {
        setResults(data.results || [])
      }
    } catch (err) {
      if (id === latestRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      if (id === latestRef.current) {
        setIsSearching(false)
      }
    }
  }, [collection, options])

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    const delay = options.debounceMs ?? 300
    timerRef.current = setTimeout(() => doSearch(query), delay)
  }, [doSearch, options.debounceMs])

  return { results, search, isSearching, error }
}
