import type { HttpClient } from "./http"
import type { PultResponse } from "./types"

export interface VectorRecord {
  id: string
  content?: string
  embedding?: number[]
  metadata?: Record<string, unknown>
}

export interface VectorSearchResult {
  id: string
  content?: string
  metadata?: Record<string, unknown>
  score: number
}

export interface VectorCollection {
  name: string
  dimensions: number
  count: number
}

export class VectorsClient {
  private http: HttpClient
  private appId: string

  constructor(http: HttpClient, appId: string) {
    this.http = http
    this.appId = appId
  }

  async upsert(collection: string, records: VectorRecord | VectorRecord[]): Promise<PultResponse<{ upserted: number }>> {
    const items = Array.isArray(records) ? records : [records]
    return this.http.post<{ upserted: number }>(`/apps/${this.appId}/vectors/${encodeURIComponent(collection)}/upsert`, { records: items })
  }

  async search(collection: string, options: { query?: string; embedding?: number[]; limit?: number; filter?: Record<string, unknown> }): Promise<PultResponse<{ results: VectorSearchResult[] }>> {
    return this.http.post<{ results: VectorSearchResult[] }>(`/apps/${this.appId}/vectors/${encodeURIComponent(collection)}/search`, options)
  }

  async delete(collection: string, ids: string[]): Promise<PultResponse<{ deleted: number }>> {
    return this.http.post<{ deleted: number }>(`/apps/${this.appId}/vectors/${encodeURIComponent(collection)}/delete`, { ids })
  }

  async collections(): Promise<PultResponse<VectorCollection[]>> {
    return this.http.get<VectorCollection[]>(`/apps/${this.appId}/vectors`)
  }
}
