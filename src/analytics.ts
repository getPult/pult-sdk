import type { HttpClient } from "./http"
import type {
  PultResponse,
  AnalyticsOverview,
  AnalyticsTimeSeries,
  WebAnalytics,
  RequestAnalytics,
  VitalsOverview,
  AnalyticsTopItem,
  RealtimeVisitors,
} from "./types"

export class AnalyticsClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async overview(appId: string, period = "24h", env?: string): Promise<PultResponse<AnalyticsOverview>> {
    return this.http.get<AnalyticsOverview>(`/apps/${appId}/analytics/overview?${this.buildParams(period, env)}`)
  }

  async timeseries(appId: string, period = "24h", env?: string): Promise<PultResponse<AnalyticsTimeSeries[]>> {
    return this.http.get<AnalyticsTimeSeries[]>(`/apps/${appId}/analytics/timeseries?${this.buildParams(period, env)}`)
  }

  async web(appId: string, period = "24h", env?: string): Promise<PultResponse<WebAnalytics>> {
    return this.http.get<WebAnalytics>(`/apps/${appId}/analytics/web?${this.buildParams(period, env)}`)
  }

  async requests(appId: string, period = "24h", env?: string): Promise<PultResponse<RequestAnalytics>> {
    return this.http.get<RequestAnalytics>(`/apps/${appId}/analytics/requests?${this.buildParams(period, env)}`)
  }

  async vitals(appId: string, period = "24h", env?: string): Promise<PultResponse<VitalsOverview>> {
    return this.http.get<VitalsOverview>(`/apps/${appId}/analytics/vitals?${this.buildParams(period, env)}`)
  }

  async events(appId: string, period = "24h", env?: string): Promise<PultResponse<AnalyticsTopItem[]>> {
    return this.http.get<AnalyticsTopItem[]>(`/apps/${appId}/analytics/events?${this.buildParams(period, env)}`)
  }

  async realtime(appId: string): Promise<PultResponse<RealtimeVisitors>> {
    return this.http.get<RealtimeVisitors>(`/apps/${appId}/analytics/realtime`)
  }

  private buildParams(period: string, env?: string): string {
    const params = new URLSearchParams({ period })
    if (env) params.set("env", env)
    return params.toString()
  }
}
