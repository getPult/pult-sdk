import type { HttpClient } from "./http"
import type { CreateDeploymentRequest, Deployment, LogLine, PultResponse } from "./types"

export class DeploymentsClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async create(appId: string, req?: CreateDeploymentRequest): Promise<PultResponse<Deployment>> {
    return this.http.post<Deployment>(`/apps/${appId}/deploy`, req ?? {})
  }

  async list(appId: string): Promise<PultResponse<Deployment[]>> {
    return this.http.get<Deployment[]>(`/apps/${appId}/deployments`)
  }

  async get(appId: string, deploymentId: string): Promise<PultResponse<Deployment>> {
    return this.http.get<Deployment>(`/apps/${appId}/deployments/${deploymentId}`)
  }

  async getBuildLogs(appId: string, deploymentId: string): Promise<PultResponse<LogLine[]>> {
    return this.http.get<LogLine[]>(`/apps/${appId}/deployments/${deploymentId}/logs`)
  }

  streamBuildLogs(
    appId: string,
    deploymentId: string,
    onLine: (line: LogLine) => void,
    onDone?: () => void,
    onError?: (err: string) => void,
  ): { close: () => void } {
    return this.http.streamSSE(
      `/apps/${appId}/deployments/${deploymentId}/logs`,
      (data) => {
        try { onLine(JSON.parse(data) as LogLine) } catch { /* skip malformed lines */ }
      },
      onDone,
      onError,
    )
  }
}
