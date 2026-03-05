"use client"

import { useState, useRef, useCallback } from "react"
import type { ChatMessage, ChatRequestOptions } from "../ai"
import { parseSSEStream } from "../ai-stream"

export interface UseChatOptions {
  apiUrl: string
  apiKey: string
  appId: string
  model?: string
  systemPrompt?: string
  onFinish?: (message: ChatMessage) => void
  onError?: (error: Error) => void
}

export interface UseChatReturn {
  messages: ChatMessage[]
  input: string
  setInput: (value: string) => void
  handleInputChange: (e: { target: { value: string } }) => void
  handleSubmit: (e?: { preventDefault?: () => void }) => void
  isLoading: boolean
  error: Error | null
  stop: () => void
  append: (message: ChatMessage) => void
  setMessages: (messages: ChatMessage[]) => void
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
  }, [])

  const sendMessages = useCallback(async (msgs: ChatMessage[]) => {
    setIsLoading(true)
    setError(null)
    abortRef.current = new AbortController()

    const allMessages: ChatMessage[] = options.systemPrompt
      ? [{ role: "system", content: options.systemPrompt }, ...msgs]
      : msgs

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
          messages: allMessages,
          stream: true,
        } satisfies ChatRequestOptions),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`Chat error: ${response.status}`)
      }

      const assistantMsg: ChatMessage = { role: "assistant", content: "" }
      setMessages((prev) => [...prev, assistantMsg])

      for await (const chunk of parseSSEStream(response)) {
        const delta = chunk.choices[0]?.delta
        if (delta?.content) {
          assistantMsg.content += delta.content
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { ...assistantMsg }
            return updated
          })
        }
      }

      options.onFinish?.(assistantMsg)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      options.onError?.(e)
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [options])

  const append = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const updated = [...prev, message]
      sendMessages(updated)
      return updated
    })
  }, [sendMessages])

  const handleSubmit = useCallback((e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.()
    if (!input.trim() || isLoading) return
    const userMsg: ChatMessage = { role: "user", content: input.trim() }
    setInput("")
    append(userMsg)
  }, [input, isLoading, append])

  const handleInputChange = useCallback((e: { target: { value: string } }) => {
    setInput(e.target.value)
  }, [])

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    append,
    setMessages,
  }
}
