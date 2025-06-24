export interface SecretConfig {
  region: string
  accessKeyId?: string
  secretAccessKey?: string
  secretName: string | string[]
}

export interface RetryConfig {
  maxAttempts: number
  delayMs: number
}

export interface LoadSecretsOptions {
  retryConfig?: RetryConfig
  validateSecrets?: boolean
  failOnError?: boolean
}
