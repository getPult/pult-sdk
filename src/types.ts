export interface PultClientOptions {
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

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}

export interface AuthUser {
  id: string
  email: string
  role: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface SignUpCredentials {
  email: string
  password: string
  metadata?: Record<string, unknown>
}

export interface SignInCredentials {
  email: string
  password: string
}

export interface OAuthSignInOptions {
  provider: "github" | "google" | "discord"
  redirectTo?: string
  scopes?: string
}

export type AuthStateEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED"

export type AuthStateCallback = (
  event: AuthStateEvent,
  session: AuthSession | null,
) => void

export interface StorageUploadOptions {
  contentType?: string
  upsert?: boolean
}

export interface StorageTransformOptions {
  width?: number
  height?: number
  quality?: number
  format?: "webp" | "avif" | "png" | "jpeg"
}

export interface RealtimeChannelOptions {
  selfBroadcast?: boolean
}

export interface RealtimeMessage {
  type: "broadcast" | "presence"
  event: string
  payload: Record<string, unknown>
}

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*"

export type RealtimeCallback = (payload: Record<string, unknown>) => void

export interface RedisSetOptions {
  ex?: number
  px?: number
  nx?: boolean
  xx?: boolean
}

export interface QueueJobOptions {
  delay?: number
  retries?: number
  priority?: number
}

export interface QueueJob<T = unknown> {
  id: string
  name: string
  data: T
  attempts: number
  timestamp: number
}

export type QueueHandler<T = unknown> = (job: QueueJob<T>) => Promise<void>
