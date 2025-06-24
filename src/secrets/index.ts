import {
  SecretsManagerClient,
  GetSecretValueCommand,
  type SecretsManagerClientConfig,
} from '@aws-sdk/client-secrets-manager'
import { SecretConfig } from './types'

interface RetryConfig {
  maxAttempts: number
  delayMs: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
}

function validateConfig(config: SecretConfig): void {
  if (!config.region) {
    throw new Error('AWS region is required')
  }

  if (!config.secretName) {
    throw new Error('Secret name is required')
  }

  // Only require credentials if not using IAM roles
  if (
    !process.env['AWS_ACCESS_KEY_ID'] &&
    !process.env['AWS_SECRET_ACCESS_KEY']
  ) {
    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error('AWS credentials are required when not using IAM roles')
    }
  }
}

function createClientConfig(config: SecretConfig): SecretsManagerClientConfig {
  const clientConfig: SecretsManagerClientConfig = {
    region: config.region,
    maxAttempts: DEFAULT_RETRY_CONFIG.maxAttempts,
  }

  // Use IAM roles if available, otherwise use provided credentials
  if (
    process.env['AWS_ACCESS_KEY_ID'] &&
    process.env['AWS_SECRET_ACCESS_KEY']
  ) {
    // Use environment variables (IAM roles or default credentials)
    console.log('Using AWS credentials from environment variables')
  } else if (config.accessKeyId && config.secretAccessKey) {
    // Use provided credentials
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    }
  }

  return clientConfig
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === retryConfig.maxAttempts) {
        throw lastError
      }

      // Exponential backoff
      const delayTime = retryConfig.delayMs * Math.pow(2, attempt - 1)
      console.warn(
        `Attempt ${attempt} failed, retrying in ${delayTime}ms:`,
        lastError.message
      )
      await delay(delayTime)
    }
  }

  throw lastError!
}

export async function loadSecrets(
  config: SecretConfig,
  retryConfig?: RetryConfig
): Promise<Record<string, string>> {
  validateConfig(config)

  const clientConfig = createClientConfig(config)
  const client = new SecretsManagerClient(clientConfig)

  const secretNames = Array.isArray(config.secretName)
    ? config.secretName
    : [config.secretName]

  const allSecrets: Record<string, string> = {}

  for (const secretName of secretNames) {
    if (!secretName || typeof secretName !== 'string') {
      console.warn('Invalid secret name provided, skipping')
      continue
    }

    try {
      const secrets = await retryWithBackoff(async () => {
        const command = new GetSecretValueCommand({
          SecretId: secretName,
        })

        const response = await client.send(command)

        if (!response.SecretString) {
          throw new Error(`Secret ${secretName} not found or empty`)
        }

        try {
          return JSON.parse(response.SecretString)
        } catch (parseError) {
          throw new Error(
            `Failed to parse secret ${secretName} as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
          )
        }
      }, retryConfig)

      Object.assign(allSecrets, secrets)
      console.log(`Successfully loaded secret: ${secretName}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error(`Error loading secret ${secretName}: ${errorMessage}`)

      // In production, you might want to throw the error
      // For now, we'll continue with other secrets
      if (process.env['NODE_ENV'] === 'production') {
        throw error
      }
    }
  }

  // Set environment variables
  Object.entries(allSecrets).forEach(([key, value]) => {
    if (key && value !== undefined && value !== null) {
      process.env[key] = String(value)
    }
  })

  return allSecrets
}

// Utility function to check if running on AWS (EC2, Lambda, etc.)
export function isRunningOnAWS(): boolean {
  return !!(
    process.env['AWS_EXECUTION_ENV'] || process.env['AWS_LAMBDA_FUNCTION_NAME']
  )
}

// Utility function to get AWS region from environment
export function getAWSRegion(): string | undefined {
  return process.env['AWS_REGION'] || process.env['AWS_DEFAULT_REGION']
}
