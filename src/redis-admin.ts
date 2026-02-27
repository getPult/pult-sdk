import type { HttpClient } from "./http"
import type {
  DeletedResponse,
  PultResponse,
  RedisInstance,
} from "./types"

export class RedisAdminClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async enable(appId: string): Promise<PultResponse<RedisInstance>> {
    return this.http.post<RedisInstance>(`/apps/${appId}/redis/enable`)
  }

  async status(appId: string): Promise<PultResponse<RedisInstance>> {
    return this.http.get<RedisInstance>(`/apps/${appId}/redis/status`)
  }

  async disable(appId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/redis/disable`)
  }
}
