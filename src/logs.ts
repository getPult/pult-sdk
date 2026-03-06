import type { HttpClient } from "./http"
import type { PultResponse } from "./types"

export class LogsClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async get(appId: string, options?: { environment?: string; service?: string }): Promise<PultResponse<string[]>> {
    const params: Record<string, string> = { format: "json" }
    if (options?.environment) params["env"] = options.environment
    if (options?.service) params["service"] = options.service
    return this.http.get<string[]>(`/apps/${appId}/logs`, params)
  }

  stream(
    appId: string,
    onLine: (line: string) => void,
    onDone?: () => void,
    onError?: (err: string) => void,
  ): { close: () => void } {
    return this.http.streamSSE(
      `/apps/${appId}/logs?follow=true`,
      onLine,
      onDone,
      onError,
    )
  }
}
