import type { HttpClient } from "./http"
import type {
  CreateServiceRequest,
  DeletedResponse,
  EnvVar,
  EnvVarResult,
  PultResponse,
  Service,
  SetEnvVarsRequest,
  UpdateServiceRequest,
} from "./types"

export class ServicesClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async create(appId: string, req: CreateServiceRequest): Promise<PultResponse<Service>> {
    return this.http.post<Service>(`/apps/${appId}/services`, req)
  }

  async list(appId: string): Promise<PultResponse<Service[]>> {
    return this.http.get<Service[]>(`/apps/${appId}/services`)
  }

  async get(appId: string, serviceId: string): Promise<PultResponse<Service>> {
    return this.http.get<Service>(`/apps/${appId}/services/${serviceId}`)
  }

  async update(appId: string, serviceId: string, req: UpdateServiceRequest): Promise<PultResponse<Service>> {
    return this.http.patch<Service>(`/apps/${appId}/services/${serviceId}`, req)
  }

  async delete(appId: string, serviceId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/services/${serviceId}`)
  }

  async deploy(appId: string, serviceId: string): Promise<PultResponse<{ deployment_id: string }>> {
    return this.http.post<{ deployment_id: string }>(`/apps/${appId}/services/${serviceId}/deploy`)
  }

  async setEnv(appId: string, serviceId: string, vars: SetEnvVarsRequest): Promise<PultResponse<EnvVarResult[]>> {
    return this.http.post<EnvVarResult[]>(`/apps/${appId}/services/${serviceId}/env`, vars)
  }

  async listEnv(appId: string, serviceId: string): Promise<PultResponse<EnvVar[]>> {
    return this.http.get<EnvVar[]>(`/apps/${appId}/services/${serviceId}/env`)
  }

  async revealEnv(appId: string, serviceId: string, key: string): Promise<PultResponse<EnvVar>> {
    return this.http.get<EnvVar>(`/apps/${appId}/services/${serviceId}/env/${key}/reveal`)
  }
}
