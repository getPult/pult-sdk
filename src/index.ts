import { AuthClient } from "./auth"
import { PultClient } from "./client"
import { DbClient } from "./db"
import type { AuthClientOptions, DbClientOptions, PultClientOptions } from "./types"

export function createClient(options: PultClientOptions): PultClient {
  return new PultClient(options)
}

export function createDbClient(options: DbClientOptions = {}): DbClient {
  return new DbClient(options)
}

export function createAuthClient(options: AuthClientOptions = {}): AuthClient {
  return new AuthClient(options)
}

export { createRealtimeClient, RealtimeClient } from "./realtime"
export { createRedisClient, RedisClient } from "./redis"
export { createQueueClient, QueueClient } from "./queue"
export { createCheckoutClient, CheckoutClient } from "./checkout"

export { PultClient } from "./client"
export { AIClient } from "./ai"
export type { ChatMessage, ChatRequestOptions, ChatResponse, EmbedResponse, ModelEntry } from "./ai"
export type { ChatChunk } from "./ai-stream"
export { VectorsClient } from "./vectors"
export type { VectorRecord, VectorSearchResult, VectorCollection } from "./vectors"
export { AnalyticsClient } from "./analytics"
export { BillingClient } from "./billing"
export { CronClient } from "./cron"
export { DbClient, QueryBuilder } from "./db"
export { AuthClient } from "./auth"
export { AppsClient } from "./apps"
export { DeploymentsClient } from "./deployments"
export { EnvironmentsClient } from "./environments"
export { LogsClient } from "./logs"
export { EnvClient } from "./env"
export { DomainsClient } from "./domains"
export { DatabasesClient } from "./databases"
export { GitClient } from "./git"
export { ServicesClient } from "./services"
export { StorageClient } from "./storage"
export { TeamsClient } from "./teams"
export { RealtimeAdminClient } from "./realtime-admin"
export { RedisAdminClient } from "./redis-admin"
export type {
  PultClientOptions,
  DbClientOptions,
  AuthClientOptions,
  PultResponse,
  PultError,
  App,
  AppRegion,
  CreateAppRequest,
  Deployment,
  CreateDeploymentRequest,
  EnvVar,
  SetEnvVarsRequest,
  EnvVarResult,
  Domain,
  AddDomainRequest,
  AddDomainResponse,
  VerifyDomainResponse,
  ManagedDatabase,
  CreateDatabaseRequest,
  DatabaseQueryRequest,
  DatabaseQueryResponse,
  Migration,
  ApplyMigrationRequest,
  DatabaseExtension,
  EnableExtensionRequest,
  DatabaseReplica,
  CreateReplicaRequest,
  StatusResponse,
  DeletedResponse,
  LogLine,
  AuthUser,
  AuthSession,
  SignUpRequest,
  SignInRequest,
  UpdateUserRequest,
  GitConnection,
  ConnectGitRequest,
  ConnectGitResponse,
  GitStatus,
  GraphQLRequest,
  GraphQLResponse,
  GraphQLError,
  StorageBucket,
  PresignRequest,
  PresignResponse,
  UpdateStorageRequest,
  RealtimeService,
  RealtimeClientOptions,
  RealtimeMessage,
  PostgresChangeFilter,
  ChannelSubscription,
  PresenceState,
  RedisInstance,
  RedisClientOptions,
  RedisCommandRequest,
  RedisCommandResponse,
  QueueClientOptions,
  QueueJob,
  AddJobRequest,
  QueueStats,
  AnalyticsOverview,
  AnalyticsTimeSeries,
  AnalyticsTopItem,
  WebAnalytics,
  RequestAnalytics,
  AnalyticsLatencyBucket,
  VitalScore,
  VitalsOverview,
  RealtimeVisitors,
  Team,
  CreateTeamRequest,
  UpdateTeamRequest,
  TeamMember,
  AddTeamMemberRequest,
  AddTeamMemberResponse,
  UpdateMemberRoleResponse,
  TeamInvite,
  AcceptInviteResponse,
  BillingStatus,
  PlanLimits,
  Subscription,
  StripeSubscription,
  StripeInvoice,
  BillingUsage,
  CheckoutResponse,
  PortalResponse,
  Service,
  CreateServiceRequest,
  UpdateServiceRequest,
  Environment,
  CreateEnvironmentRequest,
  CronJob,
  CreateCronJobRequest,
} from "./types"
