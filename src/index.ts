import { PultClient } from "./client"
import type { PultClientOptions } from "./types"

export function createClient(options: PultClientOptions): PultClient {
  return new PultClient(options)
}

export { PultClient } from "./client"
export { DatabaseClient, QueryBuilder } from "./db"
export { AuthClient } from "./auth"
export { StorageClient } from "./storage"
export { RealtimeClient, RealtimeChannel } from "./realtime"
export { RedisClient } from "./redis"
export { QueueClient } from "./queue"
export type {
  PultClientOptions,
  PultResponse,
  PultError,
  AuthSession,
  AuthUser,
  SignUpCredentials,
  SignInCredentials,
  OAuthSignInOptions,
  AuthStateEvent,
  AuthStateCallback,
  StorageUploadOptions,
  StorageTransformOptions,
  RealtimeChannelOptions,
  RealtimeMessage,
  RealtimeEvent,
  RealtimeCallback,
  RedisSetOptions,
  QueueJobOptions,
  QueueJob,
  QueueHandler,
} from "./types"
