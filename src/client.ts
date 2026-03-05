import { AIClient } from "./ai"
import { AnalyticsClient } from "./analytics"
import { AppsClient } from "./apps"
import { DatabasesClient } from "./databases"
import { DeploymentsClient } from "./deployments"
import { DomainsClient } from "./domains"
import { EnvClient } from "./env"
import { GitClient } from "./git"
import { HttpClient } from "./http"
import { LogsClient } from "./logs"
import { RealtimeAdminClient } from "./realtime-admin"
import { RedisAdminClient } from "./redis-admin"
import { StorageClient } from "./storage"
import { VectorsClient } from "./vectors"
import type { PultClientOptions, PultResponse, StatusResponse } from "./types"

export class PultClient {
  readonly ai: AIClient
  readonly analytics: AnalyticsClient
  readonly apps: AppsClient
  readonly deployments: DeploymentsClient
  readonly logs: LogsClient
  readonly env: EnvClient
  readonly domains: DomainsClient
  readonly databases: DatabasesClient
  readonly git: GitClient
  readonly storage: StorageClient
  readonly realtime: RealtimeAdminClient
  readonly redis: RedisAdminClient
  readonly vectors: VectorsClient

  private http: HttpClient

  constructor(options: PultClientOptions & { appId?: string }) {
    const headers: Record<string, string> = { ...options.headers }
    if (options.apiKey) {
      headers["Authorization"] = `Bearer ${options.apiKey}`
    }

    this.http = new HttpClient(options.url, headers)
    this.ai = new AIClient(this.http, options.appId || "", options.url, options.apiKey || "")
    this.analytics = new AnalyticsClient(this.http)
    this.apps = new AppsClient(this.http)
    this.deployments = new DeploymentsClient(this.http)
    this.logs = new LogsClient(this.http)
    this.env = new EnvClient(this.http)
    this.domains = new DomainsClient(this.http)
    this.databases = new DatabasesClient(this.http)
    this.git = new GitClient(this.http)
    this.storage = new StorageClient(this.http)
    this.realtime = new RealtimeAdminClient(this.http)
    this.redis = new RedisAdminClient(this.http)
    this.vectors = new VectorsClient(this.http, options.appId || "")
  }

  async health(): Promise<PultResponse<StatusResponse>> {
    return this.http.get<StatusResponse>("/health")
  }
}
