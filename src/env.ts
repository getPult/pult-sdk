import type { HttpClient } from "./http"
import type { DeletedResponse, EnvVar, EnvVarResult, PultResponse, SetEnvVarsRequest } from "./types"

export class EnvClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async set(appId: string, vars: SetEnvVarsRequest, environment?: string): Promise<PultResponse<EnvVarResult[]>> {
    const params = environment ? { env: environment } : undefined
    const path = params ? `/apps/${appId}/env?env=${encodeURIComponent(environment!)}` : `/apps/${appId}/env`
    return this.http.post<EnvVarResult[]>(path, vars)
  }

  async list(appId: string, options?: { decrypt?: boolean; environment?: string }): Promise<PultResponse<EnvVar[]>> {
    const params: Record<string, string> = {}
    if (options?.decrypt) params["decrypt"] = "true"
    if (options?.environment) params["env"] = options.environment
    return this.http.get<EnvVar[]>(`/apps/${appId}/env`, Object.keys(params).length > 0 ? params : undefined)
  }

  async delete(appId: string, key: string, environment?: string): Promise<PultResponse<DeletedResponse>> {
    const envParam = environment ? `?env=${encodeURIComponent(environment)}` : ""
    return this.http.del<DeletedResponse>(`/apps/${appId}/env/${encodeURIComponent(key)}${envParam}`)
  }
}
