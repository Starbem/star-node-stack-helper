import {
  SecretsManagerClient,
  GetSecretValueCommand,
  type SecretsManagerClientConfig,
} from '@aws-sdk/client-secrets-manager'
import { SecretConfig, RetryConfig } from './types'

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
}

/**
 * Validate the configuration object.
 *
 * @param {SecretConfig} config - The configuration object containing the secret name and region.
 * @returns {void}
 */

/**
 * Validate the configuration object.
 *
 * @param {SecretConfig} config - The configuration object containing the secret name and region.
 * @returns {void}
 */
/**
 * Validate the configuration object.
 *
 * @param {SecretConfig} config - The configuration object containing the secret name and region.
 * @returns {void}
 */
function validateConfig(config: SecretConfig): void {
  if (!config.region) {
    throw new Error('AWS region is required')
  }

  if (!config.secretName) {
    throw new Error('Secret name is required')
  }
}

/**
 * Create a Secrets Manager client configuration.
 *
 * @param {SecretConfig} config - The configuration object containing the secret name and region.
 * @returns {SecretsManagerClientConfig} A Secrets Manager client configuration.
 *
 * @example
 * ```typescript
 * const clientConfig = createClientConfig({
 *   secretName: 'dev/video-microservice/env',
 *   region: 'us-east-2',
 * })
 * // Output: { region: 'us-east-2', maxAttempts: 3 }
 * ```
 */
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

/**
 * Delay for a given number of milliseconds.
 *
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise<void>} A promise that resolves after the delay.
 *
 * @example
 * ```typescript
 * await delay(1000)
 * // Output: A promise that resolves after 1 second
 * ```
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry an operation with exponential backoff.
 *
 * @param {() => Promise<T>} operation - The operation to retry.
 * @param {RetryConfig} [retryConfig] - The retry configuration for the operation.
 * @returns {Promise<T>} A promise that resolves to the result of the operation.
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(async () => {
 *   return await someOperation()
 * })
 * // Output: The result of the operation
 * ```
 */
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

/**
 * Load secrets from AWS Secrets Manager.
 *
 * @param {SecretConfig} config - The configuration object containing the secret name and region.
 * @param {RetryConfig} [retryConfig] - The retry configuration for the operation.
 * @returns {Promise<Record<string, string>>} A promise that resolves to a record of secret names and their values.
 *
 * @example
 * ```typescript
 * const secrets = await loadSecrets({
 *   secretName: 'dev/video-microservice/env',
 *   region: 'us-east-2',
 * })
 * // Output: { NODE_ENV: 'development', DATABASE_URL: '...', API_KEY: '...', ... }
 * ```
 */
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

/**
 * Test function to display all saved secrets in the environment variables.
 * This function logs all environment variables to the console for debugging purposes.
 * Useful for verifying that secrets were properly loaded and set as environment variables.
 *
 * @example
 * ```typescript
 * testSavedSecrets()
 * // Output: { NODE_ENV: 'development', DATABASE_URL: '...', API_KEY: '...', ... } 'SAVED SECRETS'
 * ```
 */
export function testSavedSecrets(): void {
  console.log(process.env, 'SAVED SECRETS')
}

/**
 * Check if the current process is running on AWS (EC2, Lambda, etc.).
 *
 * @returns {boolean} True if running on AWS, false otherwise.
 *
 * @example
 * ```typescript
 * isRunningOnAWS()
 * // Output: true
 * ```
 */
export function isRunningOnAWS(): boolean {
  return !!(
    process.env['AWS_EXECUTION_ENV'] || process.env['AWS_LAMBDA_FUNCTION_NAME']
  )
}

/**
 * Get the AWS region from the environment variables.
 *
 * @returns {string | undefined} The AWS region.
 *
 * @example
 * ```typescript
 * getAWSRegion()
 * // Output: 'us-east-1'
 * ```
 */
export function getAWSRegion(): string | undefined {
  return process.env['AWS_REGION'] || process.env['AWS_DEFAULT_REGION']
}
