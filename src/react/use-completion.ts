"use client"

import { useState, useRef, useCallback } from "react"
import { parseSSEStream } from "../ai-stream"
import type { ChatRequestOptions } from "../ai"

export interface UseCompletionOptions {
  apiUrl: string
  apiKey: string
  appId: string
  model?: string
  onFinish?: (completion: string) => void
  onError?: (error: Error) => void
}

export interface UseCompletionReturn {
  completion: string
  complete: (prompt: string) => Promise<string>
  isLoading: boolean
  error: Error | null
  stop: () => void
}

export function useCompletion(options: UseCompletionOptions): UseCompletionReturn {
  const [completion, setCompletion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
  }, [])

  const complete = useCallback(async (prompt: string): Promise<string> => {
    setIsLoading(true)
    setError(null)
    setCompletion("")
    abortRef.current = new AbortController()

    let result = ""

    try {
      const response = await fetch(`${options.apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.apiKey}`,
          "X-Pult-App-Id": options.appId,
        },
        body: JSON.stringify({
          model: options.model || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          stream: true,
        } satisfies ChatRequestOptions),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Completion error: ${response.status}`)
      }

      for await (const chunk of parseSSEStream(response)) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          result += content
          setCompletion(result)
        }
      }

      options.onFinish?.(result)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return result
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      options.onError?.(e)
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }

    return result
  }, [options])

  return { completion, complete, isLoading, error, stop }
}
