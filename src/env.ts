import type { HttpClient } from "./http"
import type { DeletedResponse, EnvVar, EnvVarResult, PultResponse, SetEnvVarsRequest } from "./types"

export class EnvClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async set(appId: string, vars: SetEnvVarsRequest): Promise<PultResponse<EnvVarResult[]>> {
    return this.http.post<EnvVarResult[]>(`/apps/${appId}/env`, vars)
  }

  async list(appId: string, decrypt = false): Promise<PultResponse<EnvVar[]>> {
    const params = decrypt ? { decrypt: "true" } : undefined
    return this.http.get<EnvVar[]>(`/apps/${appId}/env`, params)
  }

  async delete(appId: string, key: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/env/${encodeURIComponent(key)}`)
  }
}
