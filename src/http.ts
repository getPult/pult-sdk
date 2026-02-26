import type { PultError, PultResponse } from "./types"

export class HttpClient {
  private baseUrl: string
  private headers: Record<string, string>

  constructor(baseUrl: string, headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "")
    this.headers = {
      "Content-Type": "application/json",
      ...headers,
    }
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<PultResponse<T>> {
    return this.request<T>(this.buildUrl(path, params), { method: "GET" })
  }

  async post<T>(path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<PultResponse<T>> {
    return this.request<T>(this.buildUrl(path), {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }, extraHeaders)
  }

  async patch<T>(path: string, body?: unknown): Promise<PultResponse<T>> {
    return this.request<T>(this.buildUrl(path), {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  async del<T>(path: string): Promise<PultResponse<T>> {
    return this.request<T>(this.buildUrl(path), { method: "DELETE" })
  }

  streamSSE(path: string, onData: (data: string) => void, onDone?: () => void, onError?: (err: string) => void): { close: () => void } {
    const url = this.buildUrl(path)
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => onData(event.data)
    eventSource.addEventListener("done", () => {
      eventSource.close()
      onDone?.()
    })
    eventSource.addEventListener("error", (event) => {
      eventSource.close()
      onError?.(event instanceof MessageEvent ? event.data : "connection lost")
    })
    eventSource.onerror = () => {
      eventSource.close()
      onError?.("connection lost")
    }

    return { close: () => eventSource.close() }
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value)
      }
    }
    return url.toString()
  }

  private async request<T>(url: string, init: RequestInit, extraHeaders?: Record<string, string>): Promise<PultResponse<T>> {
    try {
      const headers = extraHeaders ? { ...this.headers, ...extraHeaders } : this.headers
      const response = await fetch(url, { ...init, headers })

      if (!response.ok) {
        return { data: null, error: await this.parseError(response) }
      }

      if (response.status === 204 || response.headers.get("content-length") === "0") {
        return { data: null as T, error: null }
      }

      const data = (await response.json()) as T
      return { data, error: null }
    } catch (err) {
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : "Unknown error",
          code: "NETWORK_ERROR",
          status: 0,
        },
      }
    }
  }

  private async parseError(response: Response): Promise<PultError> {
    try {
      const body = (await response.json()) as Record<string, unknown>
      return {
        message: typeof body["error"] === "string" ? body["error"] : response.statusText,
        code: `HTTP_${response.status}`,
        status: response.status,
      }
    } catch {
      return { message: response.statusText, code: `HTTP_${response.status}`, status: response.status }
    }
  }
}
