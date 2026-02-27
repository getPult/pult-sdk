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
    return this.http.post<StorageBucket>(`/apps/${appId}/storage`)
  }

  async get(appId: string): Promise<PultResponse<StorageBucket>> {
    return this.http.get<StorageBucket>(`/apps/${appId}/storage`)
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
