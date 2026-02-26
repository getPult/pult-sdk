import { AuthClient } from "./auth"
import { PultClient } from "./client"
import { DbClient } from "./db"
import type { AuthClientOptions, DbClientOptions, PultClientOptions } from "./types"

export function createClient(options: PultClientOptions): PultClient {
  return new PultClient(options)
}

export function createDbClient(options: DbClientOptions): DbClient {
  return new DbClient(options)
}

export function createAuthClient(options: AuthClientOptions): AuthClient {
  return new AuthClient(options)
}

export { PultClient } from "./client"
export { DbClient, QueryBuilder } from "./db"
export { AuthClient } from "./auth"
export { AppsClient } from "./apps"
export { DeploymentsClient } from "./deployments"
export { LogsClient } from "./logs"
export { EnvClient } from "./env"
export { DomainsClient } from "./domains"
export { DatabasesClient } from "./databases"
export { GitClient } from "./git"
export type {
  PultClientOptions,
  DbClientOptions,
  AuthClientOptions,
  PultResponse,
  PultError,
  App,
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
} from "./types"
