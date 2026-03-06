import type { HttpClient } from "./http"
import type {
  DeletedResponse,
  PultResponse,
  RealtimeService,
} from "./types"

export class RealtimeAdminClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async enable(appId: string): Promise<PultResponse<RealtimeService>> {
    const result = await this.http.post<{ realtime: RealtimeService }>(`/apps/${appId}/realtime/enable`)
    if (result.error) return { data: null, error: result.error }
    return { data: result.data?.realtime ?? null, error: null }
  }

  async status(appId: string): Promise<PultResponse<RealtimeService>> {
    const result = await this.http.get<{ realtime: RealtimeService }>(`/apps/${appId}/realtime/status`)
    if (result.error) return { data: null, error: result.error }
    return { data: result.data?.realtime ?? null, error: null }
  }

  async disable(appId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/realtime/disable`)
  }
}
