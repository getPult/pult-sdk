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

  setHeader(key: string, value: string): void {
    this.headers[key] = value
  }

  removeHeader(key: string): void {
    delete this.headers[key]
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<PultResponse<T>> {
    const url = this.buildUrl(path, params)
    return this.request<T>(url, { method: "GET" })
  }

  async post<T>(path: string, body?: unknown): Promise<PultResponse<T>> {
    const url = this.buildUrl(path)
    return this.request<T>(url, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T>(path: string, body?: unknown): Promise<PultResponse<T>> {
    const url = this.buildUrl(path)
    return this.request<T>(url, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(path: string): Promise<PultResponse<T>> {
    const url = this.buildUrl(path)
    return this.request<T>(url, { method: "DELETE" })
  }

  async upload<T>(path: string, file: Blob | ArrayBuffer, contentType: string): Promise<PultResponse<T>> {
    const url = this.buildUrl(path)
    const headers = { ...this.headers, "Content-Type": contentType }
    return this.request<T>(url, { method: "POST", body: file, headers })
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

  private async request<T>(url: string, init: RequestInit & { headers?: Record<string, string> }): Promise<PultResponse<T>> {
    const headers = init.headers ?? this.headers

    try {
      const response = await fetch(url, { ...init, headers })

      if (!response.ok) {
        const error = await this.parseError(response)
        return { data: null, error }
      }

      const data = (await response.json()) as T
      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      return {
        data: null,
        error: { message, code: "NETWORK_ERROR", status: 0 },
      }
    }
  }

  private async parseError(response: Response): Promise<PultError> {
    try {
      const body = (await response.json()) as Record<string, unknown>
      return {
        message: typeof body["message"] === "string" ? body["message"] : response.statusText,
        code: typeof body["code"] === "string" ? body["code"] : `HTTP_${response.status}`,
        status: response.status,
      }
    } catch {
      return {
        message: response.statusText,
        code: `HTTP_${response.status}`,
        status: response.status,
      }
    }
  }
}
