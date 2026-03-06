import type { HttpClient } from "./http"
import type {
  CreateEnvironmentRequest,
  DeletedResponse,
  Environment,
  PultResponse,
  StatusResponse,
} from "./types"

export class EnvironmentsClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async create(appId: string, req: CreateEnvironmentRequest): Promise<PultResponse<Environment>> {
    return this.http.post<Environment>(`/apps/${appId}/environments`, req)
  }

  async list(appId: string): Promise<PultResponse<Environment[]>> {
    return this.http.get<Environment[]>(`/apps/${appId}/environments`)
  }

  async get(appId: string, envId: string): Promise<PultResponse<Environment>> {
    return this.http.get<Environment>(`/apps/${appId}/environments/${envId}`)
  }

  async delete(appId: string, envId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/environments/${envId}`)
  }

  async promote(appId: string, envId: string): Promise<PultResponse<StatusResponse>> {
    return this.http.post<StatusResponse>(`/apps/${appId}/environments/${envId}/promote`)
  }
}
