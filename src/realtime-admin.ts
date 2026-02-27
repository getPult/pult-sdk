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
    return this.http.post<RealtimeService>(`/apps/${appId}/realtime/enable`)
  }

  async status(appId: string): Promise<PultResponse<RealtimeService>> {
    return this.http.get<RealtimeService>(`/apps/${appId}/realtime/status`)
  }

  async disable(appId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/realtime/disable`)
  }
}
