import type { HttpClient } from "./http"
import type { PultResponse } from "./types"

export class LogsClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async get(appId: string): Promise<PultResponse<string[]>> {
    return this.http.get<string[]>(`/apps/${appId}/logs`)
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
