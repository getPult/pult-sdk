import type { HttpClient } from "./http"
import type {
  DeletedResponse,
  PresignRequest,
  PresignResponse,
  PultResponse,
  StorageBucket,
  UpdateStorageRequest,
} from "./types"

export class StorageClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async create(appId: string): Promise<PultResponse<StorageBucket>> {
    const result = await this.http.post<StorageBucket & { storage?: StorageBucket }>(`/apps/${appId}/storage`)
    if (result.error) return { data: null, error: result.error }
    const raw = result.data
    return { data: raw?.storage ?? raw ?? null, error: null }
  }

  async get(appId: string): Promise<PultResponse<StorageBucket>> {
    const result = await this.http.get<{ storage: StorageBucket }>(`/apps/${appId}/storage`)
    if (result.error) return { data: null, error: result.error }
    return { data: result.data?.storage ?? null, error: null }
  }

  async update(appId: string, req: UpdateStorageRequest): Promise<PultResponse<StorageBucket>> {
    return this.http.patch<StorageBucket>(`/apps/${appId}/storage`, req)
  }

  async delete(appId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/storage`)
  }

  async presign(appId: string, req: PresignRequest): Promise<PultResponse<PresignResponse>> {
    return this.http.post<PresignResponse>(`/apps/${appId}/storage/presign`, req)
  }
}
