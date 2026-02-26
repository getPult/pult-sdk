import type { HttpClient } from "./http"
import type { PultResponse } from "./types"

export class DatabaseClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.http, table)
  }

  async graphql<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<PultResponse<T>> {
    return this.http.post<T>("/rest/v1/rpc/graphql", { query, variables })
  }
}

export class QueryBuilder<T> {
  private http: HttpClient
  private table: string
  private filters: string[] = []
  private selectColumns = "*"
  private orderClause = ""
  private limitCount: number | null = null
  private offsetCount: number | null = null
  private method: "GET" | "POST" | "PATCH" | "DELETE" = "GET"
  private body: unknown = undefined

  constructor(http: HttpClient, table: string) {
    this.http = http
    this.table = table
  }

  select(columns = "*"): this {
    this.method = "GET"
    this.selectColumns = columns
    return this
  }

  insert(data: Partial<T> | Partial<T>[]): this {
    this.method = "POST"
    this.body = data
    return this
  }

  update(data: Partial<T>): this {
    this.method = "PATCH"
    this.body = data
    return this
  }

  delete(): this {
    this.method = "DELETE"
    return this
  }

  eq(column: string, value: unknown): this {
    this.filters.push(`${column}=eq.${value}`)
    return this
  }

  neq(column: string, value: unknown): this {
    this.filters.push(`${column}=neq.${value}`)
    return this
  }

  gt(column: string, value: unknown): this {
    this.filters.push(`${column}=gt.${value}`)
    return this
  }

  gte(column: string, value: unknown): this {
    this.filters.push(`${column}=gte.${value}`)
    return this
  }

  lt(column: string, value: unknown): this {
    this.filters.push(`${column}=lt.${value}`)
    return this
  }

  lte(column: string, value: unknown): this {
    this.filters.push(`${column}=lte.${value}`)
    return this
  }

  like(column: string, pattern: string): this {
    this.filters.push(`${column}=like.${pattern}`)
    return this
  }

  ilike(column: string, pattern: string): this {
    this.filters.push(`${column}=ilike.${pattern}`)
    return this
  }

  is(column: string, value: "null" | "true" | "false"): this {
    this.filters.push(`${column}=is.${value}`)
    return this
  }

  in(column: string, values: unknown[]): this {
    this.filters.push(`${column}=in.(${values.join(",")})`)
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    const direction = options?.ascending === false ? "desc" : "asc"
    this.orderClause = `${column}.${direction}`
    return this
  }

  limit(count: number): this {
    this.limitCount = count
    return this
  }

  range(from: number, to: number): this {
    this.offsetCount = from
    this.limitCount = to - from + 1
    return this
  }

  single(): Promise<PultResponse<T>> {
    this.limitCount = 1
    return this.execute() as Promise<PultResponse<T>>
  }

  async execute(): Promise<PultResponse<T[]>> {
    const path = `/rest/v1/${this.table}`
    const params: Record<string, string> = {}

    if (this.selectColumns !== "*") {
      params["select"] = this.selectColumns
    }

    for (const filter of this.filters) {
      const [key, ...rest] = filter.split("=")
      if (key) params[key] = rest.join("=")
    }

    if (this.orderClause) params["order"] = this.orderClause
    if (this.limitCount !== null) params["limit"] = String(this.limitCount)
    if (this.offsetCount !== null) params["offset"] = String(this.offsetCount)

    switch (this.method) {
      case "GET":
        return this.http.get<T[]>(path, params)
      case "POST":
        return this.http.post<T[]>(path, this.body)
      case "PATCH":
        return this.http.patch<T[]>(path, this.body)
      case "DELETE":
        return this.http.delete<T[]>(path)
    }
  }

  then<TResult1 = PultResponse<T[]>, TResult2 = never>(
    onfulfilled?: ((value: PultResponse<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }
}
