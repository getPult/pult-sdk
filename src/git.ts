import type { HttpClient } from "./http"
import type { ConnectGitRequest, ConnectGitResponse, DeletedResponse, GitStatus, PultResponse } from "./types"

export class GitClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async connect(appId: string, req: ConnectGitRequest): Promise<PultResponse<ConnectGitResponse>> {
    return this.http.post<ConnectGitResponse>(`/apps/${appId}/git/connect`, req)
  }

  async status(appId: string): Promise<PultResponse<GitStatus>> {
    return this.http.get<GitStatus>(`/apps/${appId}/git/status`)
  }

  async disconnect(appId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/git/disconnect`)
  }
}
