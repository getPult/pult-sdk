import type { HttpClient } from "./http"
import type { AddDomainRequest, AddDomainResponse, DeletedResponse, Domain, PultResponse, VerifyDomainResponse } from "./types"

export class DomainsClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async add(appId: string, req: AddDomainRequest): Promise<PultResponse<AddDomainResponse>> {
    return this.http.post<AddDomainResponse>(`/apps/${appId}/domains`, req)
  }

  async list(appId: string): Promise<PultResponse<Domain[]>> {
    return this.http.get<Domain[]>(`/apps/${appId}/domains`)
  }

  async verify(appId: string, domainId: string): Promise<PultResponse<VerifyDomainResponse>> {
    return this.http.post<VerifyDomainResponse>(`/apps/${appId}/domains/${domainId}/verify`)
  }

  async delete(appId: string, domainId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/apps/${appId}/domains/${domainId}`)
  }
}
