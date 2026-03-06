import { AIClient } from "./ai"
import { AnalyticsClient } from "./analytics"
import { AppsClient } from "./apps"
import { BillingClient } from "./billing"
import { CronClient } from "./cron"
import { DatabasesClient } from "./databases"
import { DeploymentsClient } from "./deployments"
import { DomainsClient } from "./domains"
import { EnvClient } from "./env"
import { EnvironmentsClient } from "./environments"
import { GitClient } from "./git"
import { HttpClient } from "./http"
import { LogsClient } from "./logs"
import { RealtimeAdminClient } from "./realtime-admin"
import { RedisAdminClient } from "./redis-admin"
import { ServicesClient } from "./services"
import { StorageClient } from "./storage"
import { TeamsClient } from "./teams"
import { VectorsClient } from "./vectors"
import type { PultClientOptions, PultResponse, StatusResponse } from "./types"

export class PultClient {
  readonly ai: AIClient
  readonly analytics: AnalyticsClient
  readonly apps: AppsClient
  readonly billing: BillingClient
  readonly cron: CronClient
  readonly deployments: DeploymentsClient
  readonly logs: LogsClient
  readonly env: EnvClient
  readonly environments: EnvironmentsClient
  readonly domains: DomainsClient
  readonly databases: DatabasesClient
  readonly git: GitClient
  readonly services: ServicesClient
  readonly storage: StorageClient
  readonly teams: TeamsClient
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
    this.billing = new BillingClient(this.http)
    this.cron = new CronClient(this.http)
    this.deployments = new DeploymentsClient(this.http)
    this.logs = new LogsClient(this.http)
    this.env = new EnvClient(this.http)
    this.environments = new EnvironmentsClient(this.http)
    this.domains = new DomainsClient(this.http)
    this.databases = new DatabasesClient(this.http)
    this.git = new GitClient(this.http)
    this.services = new ServicesClient(this.http)
    this.storage = new StorageClient(this.http)
    this.teams = new TeamsClient(this.http)
    this.realtime = new RealtimeAdminClient(this.http)
    this.redis = new RedisAdminClient(this.http)
    this.vectors = new VectorsClient(this.http, options.appId || "")
  }

  async health(): Promise<PultResponse<StatusResponse>> {
    return this.http.get<StatusResponse>("/health")
  }
}
