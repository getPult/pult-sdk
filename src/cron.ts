import type { HttpClient } from "./http"
import type {
  CreateCronJobRequest,
  CronJob,
  DeletedResponse,
  PultResponse,
  StatusResponse,
} from "./types"

export class CronClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async list(appId: string): Promise<PultResponse<{ jobs: CronJob[] }>> {
    return this.http.get<{ jobs: CronJob[] }>(`/apps/${appId}/cron/jobs`)
  }

  async create(appId: string, req: CreateCronJobRequest): Promise<PultResponse<{ job_id: number }>> {
    return this.http.post<{ job_id: number }>(`/apps/${appId}/cron/jobs`, req)
  }

  async delete(appId: string, jobId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/cron/jobs/${jobId}`)
  }

  async toggle(appId: string, jobId: string): Promise<PultResponse<StatusResponse>> {
    return this.http.post<StatusResponse>(`/apps/${appId}/cron/jobs/${jobId}/toggle`)
  }
}
