export interface PultClientOptions {
  url: string
  apiKey?: string
  headers?: Record<string, string>
}

export interface DbClientOptions {
  url: string
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
