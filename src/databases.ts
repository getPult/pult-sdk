import type { HttpClient } from "./http"
import type {
  ApplyMigrationRequest,
  CreateDatabaseRequest,
  CreateReplicaRequest,
  DatabaseExtension,
  DatabaseQueryRequest,
  DatabaseQueryResponse,
  DatabaseReplica,
  DeletedResponse,
  EnableExtensionRequest,
  ManagedDatabase,
  Migration,
  PultResponse,
} from "./types"

export class DatabasesClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async create(appId: string, req?: CreateDatabaseRequest): Promise<PultResponse<ManagedDatabase>> {
    return this.http.post<ManagedDatabase>(`/apps/${appId}/database`, req ?? {})
  }

  async get(appId: string, secret = false): Promise<PultResponse<ManagedDatabase>> {
    const params = secret ? { secret: "true" } : undefined
    return this.http.get<ManagedDatabase>(`/apps/${appId}/database`, params)
  }

  async delete(appId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/database`)
  }

  async query(appId: string, req: DatabaseQueryRequest): Promise<PultResponse<DatabaseQueryResponse>> {
    return this.http.post<DatabaseQueryResponse>(`/apps/${appId}/database/query`, req)
  }

  sql(appId: string): (strings: TemplateStringsArray, ...values: unknown[]) => Promise<PultResponse<DatabaseQueryResponse>> {
    return (strings: TemplateStringsArray, ...values: unknown[]) => {
      let sql = strings[0] ?? ""
      for (let i = 0; i < values.length; i++) {
        sql += `$${i + 1}${strings[i + 1] ?? ""}`
      }
      return this.query(appId, { sql, params: values })
    }
  }

  async listMigrations(appId: string): Promise<PultResponse<Migration[]>> {
    return this.http.get<Migration[]>(`/apps/${appId}/database/migrations`)
  }

  async applyMigration(appId: string, req: ApplyMigrationRequest): Promise<PultResponse<Migration>> {
    return this.http.post<Migration>(`/apps/${appId}/database/migrations`, req)
  }

  async listExtensions(appId: string): Promise<PultResponse<DatabaseExtension[]>> {
    return this.http.get<DatabaseExtension[]>(`/apps/${appId}/database/extensions`)
  }

  async enableExtension(appId: string, req: EnableExtensionRequest): Promise<PultResponse<DatabaseExtension>> {
    return this.http.post<DatabaseExtension>(`/apps/${appId}/database/extensions`, req)
  }

  async createReplica(appId: string, req: CreateReplicaRequest): Promise<PultResponse<DatabaseReplica>> {
    return this.http.post<DatabaseReplica>(`/apps/${appId}/database/replicas`, req)
  }

  async listReplicas(appId: string): Promise<PultResponse<DatabaseReplica[]>> {
    return this.http.get<DatabaseReplica[]>(`/apps/${appId}/database/replicas`)
  }

  async deleteReplica(appId: string, region: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/database/replicas/${encodeURIComponent(region)}`)
  }
}
