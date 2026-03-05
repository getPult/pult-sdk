import type { HttpClient } from "./http"
import type { PultResponse } from "./types"
import { type ChatChunk, streamToAsyncIterable } from "./ai-stream"

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
  name?: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: "function"
    function: { name: string; arguments: string }
  }>
}

export interface ChatRequestOptions {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  stream?: boolean
  tools?: Array<{
    type: "function"
    function: { name: string; description?: string; parameters?: Record<string, unknown> }
  }>
  response_format?: { type: "json_object" | "text" }
}

export interface ChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finish_reason: string
  }>
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export interface EmbedResponse {
  object: string
  data: Array<{ object: string; embedding: number[]; index: number }>
  model: string
  usage: { prompt_tokens: number; total_tokens: number }
}

export interface ModelEntry {
  id: string
  object: string
  owned_by: string
  context_length?: number
}

export class AIClient {
  private http: HttpClient
  private appId: string
  private baseUrl: string
  private apiKey: string

  constructor(http: HttpClient, appId: string, baseUrl: string, apiKey: string) {
    this.http = http
    this.appId = appId
    this.baseUrl = baseUrl.replace(/\/+$/, "")
    this.apiKey = apiKey
  }

  async chat(options: ChatRequestOptions & { stream: true }): Promise<AsyncIterable<ChatChunk>>
  async chat(options: ChatRequestOptions & { stream?: false }): Promise<PultResponse<ChatResponse>>
  async chat(options: ChatRequestOptions): Promise<PultResponse<ChatResponse> | AsyncIterable<ChatChunk>> {
    if (options.stream) {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "X-Pult-App-Id": this.appId,
        },
        body: JSON.stringify(options),
      })
      if (!response.ok) {
        throw new Error(`AI chat error: ${response.status} ${await response.text()}`)
      }
      return streamToAsyncIterable(response)
    }

    return this.http.post<ChatResponse>("/v1/chat/completions", options, {
      "X-Pult-App-Id": this.appId,
    })
  }

  async embed(input: string | string[], model: string): Promise<PultResponse<EmbedResponse>> {
    return this.http.post<EmbedResponse>("/v1/embeddings", { input, model }, {
      "X-Pult-App-Id": this.appId,
    })
  }

  async models(): Promise<PultResponse<{ object: string; data: ModelEntry[] }>> {
    return this.http.get<{ object: string; data: ModelEntry[] }>("/v1/models")
  }
}
