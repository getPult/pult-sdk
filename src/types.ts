export interface PultClientOptions {
  url: string
  apiKey?: string
  headers?: Record<string, string>
}

export interface DbClientOptions {
  url?: string
  apiKey?: string
  headers?: Record<string, string>
}

export interface PultResponse<T> {
  data: T | null
  error: PultError | null
}

export interface PultError {
  message: string
  code: string
  status: number
}

export interface App {
  id: string
  name: string
  owner_id: string
  repo?: string
  framework?: string
  region: string
  status: "active" | "paused" | "deleted"
  created_at: string
  updated_at: string
}

export interface CreateAppRequest {
  name: string
  repo?: string
  framework?: string
  region?: string
}

export interface Deployment {
  id: string
  app_id: string
  image?: string
  status: "pending" | "building" | "deploying" | "ready" | "failed"
  commit_sha?: string
  logs?: string
  created_at: string
  updated_at: string
}

export interface CreateDeploymentRequest {
  commit_sha?: string
}

export interface EnvVar {
  id: string
  app_id: string
  key: string
  value: string
  environment: string
  created_at: string
  updated_at: string
}

export interface SetEnvVarsRequest {
  [key: string]: string
}

export interface EnvVarResult {
  key: string
  status: string
}

export interface Domain {
  id: string
  app_id: string
  domain: string
  status: "pending" | "verified" | "failed"
  verified_at?: string
  created_at: string
  updated_at: string
}

export interface AddDomainRequest {
  domain: string
}

export interface AddDomainResponse {
  domain: Domain
  dns_instructions: {
    type: string
    name: string
    value: string
    note: string
  }
}

export interface VerifyDomainResponse {
  verified: boolean
  domain?: string
  cname?: string
  error?: string
  expected?: string
}

export interface ManagedDatabase {
  id: string
  app_id: string
  name: string
  host?: string
  port: number
  username?: string
  status: "provisioning" | "ready" | "error" | "deleting"
  size: string
  region: string
  error_message?: string
  connection_string?: string
  created_at: string
  updated_at: string
}

export interface CreateDatabaseRequest {
  size?: string
}

export interface DatabaseQueryRequest {
  sql: string
  params?: unknown[]
}

export interface DatabaseQueryResponse {
  columns: string[]
  rows: unknown[][]
  row_count: number
}

export interface Migration {
  id: number
  name: string
  applied_at: string
}

export interface ApplyMigrationRequest {
  name: string
  sql: string
}

export interface DatabaseExtension {
  name: string
  installed: boolean
  version?: string
  description?: string
}

export interface EnableExtensionRequest {
  name: string
}

export interface DatabaseReplica {
  id: string
  database_id: string
  region: string
  host?: string
  status: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface CreateReplicaRequest {
  region: string
}

export interface StatusResponse {
  status: string
}

export interface DeletedResponse {
  status: "deleted"
}

export interface LogLine {
  timestamp: string
  step: string
  level: string
  message: string
}

export interface AuthClientOptions {
  url?: string
  headers?: Record<string, string>
}

export interface AuthUser {
  id: string
  email: string
  role: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
  email_confirmed_at?: string
  created_at: string
  updated_at: string
}

export interface AuthSession {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  user: AuthUser
}

export interface SignUpRequest {
  email: string
  password: string
  data?: Record<string, unknown>
}

export interface SignInRequest {
  email: string
  password: string
}

export interface UpdateUserRequest {
  email?: string
  password?: string
  data?: Record<string, unknown>
}

export interface GitConnection {
  id: string
  app_id: string
  provider: string
  repo_full_name: string
  repo_url: string
  branch: string
  auto_deploy: boolean
  created_at: string
  updated_at: string
}

export interface ConnectGitRequest {
  repo: string
  branch?: string
}

export interface ConnectGitResponse {
  connection: GitConnection
  webhook: {
    url: string
    secret: string
    content_type: string
    events: string
  }
  instructions: string
  next: string
}

export interface GraphQLRequest {
  query: string
  variables?: Record<string, unknown>
  operationName?: string
}

export interface GraphQLResponse<T = Record<string, unknown>> {
  data: T | null
  errors?: GraphQLError[]
}

export interface GraphQLError {
  message: string
  locations?: { line: number; column: number }[]
  path?: string[]
}

export interface GitStatus {
  connected: boolean
  provider?: string
  repo?: string
  branch?: string
  auto_deploy?: boolean
  created_at?: string
}

export interface StorageBucket {
  id: string
  app_id: string
  bucket_name: string
  endpoint: string
  status: "provisioning" | "ready" | "error" | "deleting"
  is_public: boolean
  error_message?: string
  created_at: string
  updated_at: string
}

export interface PresignRequest {
  key: string
  method: "PUT" | "GET"
  expiry?: number
}

export interface PresignResponse {
  url: string
  method: string
  key: string
  bucket: string
}

export interface UpdateStorageRequest {
  is_public: boolean
}

export interface RealtimeService {
  id: string
  app_id: string
  status: "provisioning" | "ready" | "error" | "deleting"
  endpoint?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface RealtimeClientOptions {
  url?: string
  token?: string
}

export interface RealtimeMessage {
  type: string
  channel?: string
  event?: string
  payload?: unknown
  ref?: string
}

export interface PostgresChangeFilter {
  event?: string
  schema?: string
  table?: string
}

export interface ChannelSubscription {
  channel: string
  on(event: string, callback: (payload: unknown) => void): ChannelSubscription
  subscribe(): void
  unsubscribe(): void
}

export interface PresenceState {
  [key: string]: Record<string, unknown>
}

export interface RedisInstance {
  id: string
  app_id: string
  endpoint: string
  status: "provisioning" | "ready" | "error" | "deleting"
  max_memory_mb: number
  error_message?: string
  created_at: string
  updated_at: string
}

export interface RedisClientOptions {
  url?: string
  token?: string
}

export interface RedisCommandRequest {
  cmd: string[]
}

export interface RedisCommandResponse {
  result: unknown
}

export interface QueueClientOptions {
  url?: string
  token?: string
  queueName?: string
}

export interface QueueJob {
  id: string
  name: string
  data: unknown
  status: "waiting" | "active" | "delayed" | "completed" | "failed"
  attempts: number
  max_attempts: number
  created_at: number
  processed_at?: number
  finished_at?: number
}

export interface AddJobRequest {
  name: string
  data: unknown
  delay?: number
  attempts?: number
}

export interface QueueStats {
  waiting: number
  active: number
  delayed: number
  completed: number
  failed: number
}

export interface AnalyticsOverview {
  visitors: number
  pageviews: number
  requests: number
  errors: number
  avg_latency_ms: number
  bounce_rate: number
  visitors_delta: number
  requests_delta: number
}

export interface AnalyticsTimeSeries {
  time: string
  visitors: number
  pageviews: number
  requests: number
  errors: number
}

export interface AnalyticsTopItem {
  name: string
  count: number
}

export interface WebAnalytics {
  visitors: number
  pageviews: number
  top_pages: AnalyticsTopItem[]
  top_referrers: AnalyticsTopItem[]
  countries: AnalyticsTopItem[]
  devices: AnalyticsTopItem[]
  browsers: AnalyticsTopItem[]
}

export interface RequestAnalytics {
  top_paths: AnalyticsTopItem[]
  status_distribution: AnalyticsTopItem[]
  latency_distribution: AnalyticsLatencyBucket[]
  total_requests: number
  total_errors: number
  avg_latency_ms: number
}

export interface AnalyticsLatencyBucket {
  bucket: string
  count: number
}

export interface VitalScore {
  p75: number
  good: number
  needs: number
  poor: number
}

export interface VitalsOverview {
  lcp: VitalScore
  cls: VitalScore
  inp: VitalScore
  fcp: VitalScore
  ttfb: VitalScore
}

export interface RealtimeVisitors {
  live_visitors: number
}

export interface Team {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface CreateTeamRequest {
  name: string
}

export interface UpdateTeamRequest {
  name: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: "owner" | "admin" | "member"
  user_email: string
  user_name: string
  joined_at: string
}

export interface AddTeamMemberRequest {
  email: string
  role?: "admin" | "member"
}

export interface AddTeamMemberResponse {
  status: "invited" | "created"
  email: string
  team_id: string
  message: string
}

export interface UpdateMemberRoleResponse {
  status: "updated"
  role: string
}

export interface TeamInvite {
  id: string
  team_id: string
  email: string
  role: string
  inviter_id: string
  expires_at: string
  created_at: string
}

export interface AcceptInviteResponse {
  status: "joined" | "already_member"
  team_id: string
  team_name: string
  role: string
}

export interface BillingStatus {
  plan: string
  limits: PlanLimits
  usage: { apps: number }
  subscription: Subscription | null
  grace_period: {
    active: boolean
    ends_at: string
    message: string
    deploys_blocked: boolean
  } | null
}

export interface PlanLimits {
  max_apps: number
  max_ram_mb: number
  max_db_mb: number
  max_storage_mb: number
  regions: string[]
  all_regions: boolean
  max_web_events_month: number
  analytics_retention_days: number
  max_custom_event_keys: number
  web_vitals: boolean
  realtime_visitors: boolean
  max_ai_requests_month: number
  max_byok_providers: number
  max_vector_dimensions: number
  semantic_cache: boolean
  managed_keys: boolean
  failover_routing: boolean
  ai_observ_retention_days: number
  ai_rate_limit_rpm: number
  ai_rate_limit_tpm: number
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  plan: string
  status: string
  interval: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  grace_period_ends_at?: string
  created_at: string
  updated_at: string
}

export interface StripeSubscription {
  id: string
  plan: string
  status: string
  interval: string
  current_period_end: number
  cancel_at_period_end: boolean
  created_at: number
}

export interface StripeInvoice {
  id: string
  amount: number
  currency: string
  status: string
  period_start: number
  period_end: number
  pdf_url?: string
  created_at: number
}

export interface BillingUsage {
  usage: {
    compute_hours: number
    bandwidth_gb: number
    storage_gb: number
    database_gb: number
    builds: number
    apps: number
  }
}

export interface CheckoutResponse {
  checkout_url: string
}

export interface PortalResponse {
  portal_url: string
}

export interface Service {
  id: string
  app_id: string
  name: string
  type: "web" | "api" | "worker" | "cron"
  repo?: string
  root_dir?: string
  framework?: string
  port: number
  status: string
  build_command?: string
  start_command?: string
  install_command?: string
  output_dir?: string
  runtime_version?: string
  dockerfile_path?: string
  created_at: string
  updated_at: string
}

export interface CreateServiceRequest {
  name: string
  type?: "web" | "api" | "worker" | "cron"
  repo?: string
  root_dir?: string
  port?: number
  build_command?: string
  start_command?: string
  dockerfile_path?: string
}

export interface UpdateServiceRequest {
  name?: string
  port?: number
  build_command?: string
  start_command?: string
  install_command?: string
  output_dir?: string
  runtime_version?: string
  dockerfile_path?: string
}

export interface Environment {
  id: string
  app_id: string
  name: string
  slug: string
  branch?: string
  is_production: boolean
  is_ephemeral: boolean
  pr_number?: number
  source_env_id?: string
  status: string
  has_database: boolean
  has_auth: boolean
  has_storage: boolean
  has_redis: boolean
  has_realtime: boolean
  created_at: string
  updated_at: string
}

export interface CreateEnvironmentRequest {
  name: string
  branch?: string
  source_env_id?: string
}

export interface CronJob {
  id: string
  name: string
  schedule: string
  command: string
  enabled: boolean
  last_run_at?: string
  created_at: string
}

export interface CreateCronJobRequest {
  name: string
  schedule: string
  command: string
}
