import type { HttpClient } from "./http"
import type { PultResponse, StorageTransformOptions, StorageUploadOptions } from "./types"

interface StorageObject {
  name: string
  size: number
  contentType: string
  createdAt: string
  updatedAt: string
}

export class StorageClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  from(bucket: string): StorageBucket {
    return new StorageBucket(this.http, bucket)
  }
}

class StorageBucket {
  private http: HttpClient
  private bucket: string

  constructor(http: HttpClient, bucket: string) {
    this.http = http
    this.bucket = bucket
  }

  async upload(path: string, file: Blob | ArrayBuffer, options?: StorageUploadOptions): Promise<PultResponse<StorageObject>> {
    const contentType = options?.contentType ?? "application/octet-stream"
    const method = options?.upsert ? "upsert" : "upload"
    return this.http.upload<StorageObject>(
      `/storage/v1/object/${method}/${this.bucket}/${path}`,
      file,
      contentType,
    )
  }

  async download(path: string): Promise<PultResponse<Blob>> {
    return this.http.get<Blob>(`/storage/v1/object/${this.bucket}/${path}`)
  }

  getPublicUrl(path: string, transform?: StorageTransformOptions): string {
    const base = `/storage/v1/object/public/${this.bucket}/${path}`
    if (!transform) return base
    const params = new URLSearchParams()
    if (transform.width) params.set("width", String(transform.width))
    if (transform.height) params.set("height", String(transform.height))
    if (transform.quality) params.set("quality", String(transform.quality))
    if (transform.format) params.set("format", transform.format)
    return `${base}?${params.toString()}`
  }

  async list(prefix = ""): Promise<PultResponse<StorageObject[]>> {
    return this.http.get<StorageObject[]>(`/storage/v1/object/list/${this.bucket}`, {
      prefix,
    })
  }

  async remove(paths: string[]): Promise<PultResponse<StorageObject[]>> {
    return this.http.delete<StorageObject[]>(`/storage/v1/object/${this.bucket}`)
  }

  async move(from: string, to: string): Promise<PultResponse<null>> {
    return this.http.post<null>("/storage/v1/object/move", {
      bucket: this.bucket,
      from,
      to,
    })
  }
}
