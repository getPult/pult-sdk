import type { HttpClient } from "./http"
import type { App, CreateAppRequest, DeletedResponse, PultResponse } from "./types"

export class AppsClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async create(req: CreateAppRequest): Promise<PultResponse<App>> {
    return this.http.post<App>("/apps", req)
  }

  async list(): Promise<PultResponse<App[]>> {
    return this.http.get<App[]>("/apps")
  }

  async get(appId: string): Promise<PultResponse<App>> {
    return this.http.get<App>(`/apps/${appId}`)
  }

  async delete(appId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}`)
  }
}
