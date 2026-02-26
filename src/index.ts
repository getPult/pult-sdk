import { PultClient } from "./client"
import { DbClient } from "./db"
import type { DbClientOptions, PultClientOptions } from "./types"

export function createClient(options: PultClientOptions): PultClient {
  return new PultClient(options)
}

export function createDbClient(options: DbClientOptions): DbClient {
  return new DbClient(options)
}

export { PultClient } from "./client"
export { DbClient, QueryBuilder } from "./db"
export { AppsClient } from "./apps"
export { DeploymentsClient } from "./deployments"
export { LogsClient } from "./logs"
export { EnvClient } from "./env"
export { DomainsClient } from "./domains"
export { DatabasesClient } from "./databases"
export type {
  PultClientOptions,
  DbClientOptions,
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
} from "./types"
