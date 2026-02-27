import { AppsClient } from "./apps"
import { DatabasesClient } from "./databases"
import { DeploymentsClient } from "./deployments"
import { DomainsClient } from "./domains"
import { EnvClient } from "./env"
import { GitClient } from "./git"
import { HttpClient } from "./http"
import { LogsClient } from "./logs"
import { RealtimeAdminClient } from "./realtime-admin"
import { StorageClient } from "./storage"
import type { PultClientOptions, PultResponse, StatusResponse } from "./types"

export class PultClient {
  readonly apps: AppsClient
  readonly deployments: DeploymentsClient
  readonly logs: LogsClient
  readonly env: EnvClient
  readonly domains: DomainsClient
  readonly databases: DatabasesClient
  readonly git: GitClient
  readonly storage: StorageClient
  readonly realtime: RealtimeAdminClient

  private http: HttpClient

  constructor(options: PultClientOptions) {
    const headers: Record<string, string> = { ...options.headers }
    if (options.apiKey) {
      headers["Authorization"] = `Bearer ${options.apiKey}`
    }

    this.http = new HttpClient(options.url, headers)
    this.apps = new AppsClient(this.http)
    this.deployments = new DeploymentsClient(this.http)
    this.logs = new LogsClient(this.http)
    this.env = new EnvClient(this.http)
    this.domains = new DomainsClient(this.http)
    this.databases = new DatabasesClient(this.http)
    this.git = new GitClient(this.http)
    this.storage = new StorageClient(this.http)
    this.realtime = new RealtimeAdminClient(this.http)
  }

  async health(): Promise<PultResponse<StatusResponse>> {
    return this.http.get<StatusResponse>("/health")
  }
}
