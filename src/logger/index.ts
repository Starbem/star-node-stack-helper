import { Client, ClientOptions } from '@opensearch-project/opensearch'
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import {
  LoggerConfig,
  LogLevel,
  LogTransaction,
  SearchQuery,
  OpenSearchHit,
  OpenSearchResponse,
} from './types'

export class ElasticLogger {
  private client: Client
  private index: string
  private service: string
  private environment: string
  private region: string
  private readonly timeout = 30000

  constructor(config: LoggerConfig) {
    this.validateConfig(config)
    this.index = config.index
    this.service = config.service
    this.environment = config.environment
    this.region = config.region

    const clientConfig: ClientOptions = {
      node: config.node,
      ssl: {
        rejectUnauthorized: this.environment === 'production',
      },
      requestTimeout: this.timeout,
      maxRetries: 3,
    }

    if (config.authType === 'aws' || (!config.username && !config.password)) {
      console.info('Using AWS SigV4 authentication')
      Object.assign(
        clientConfig,
        AwsSigv4Signer({
          region: this.region,
          service: 'aoss',
          getCredentials: () => {
            const credentialsProvider = defaultProvider()
            return credentialsProvider()
          },
        })
      )
    } else if (config.username && config.password) {
      console.info('Using username/password authentication')
      clientConfig.auth = {
        username: config.username,
        password: config.password,
      }
    } else {
      throw new Error(
        'Authentication configuration is required. Either set authType: "aws" or provide username and password.'
      )
    }

    this.client = new Client(clientConfig)
  }

  /**
   * Validates the configuration to ensure that all required fields are present
   *
   * This method validates the configuration to ensure that all required fields are present.
   *
   * @param config - The configuration to validate
   * @returns void
   *
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * logger.validateConfig(config)
   * ```
   */
  private validateConfig(config: LoggerConfig): void {
    if (
      !config.node ||
      !config.index ||
      !config.service ||
      !config.environment
    ) {
      throw new Error('All LoggerConfig fields are required')
    }
  }

  /**
   * Validates the queries to ensure that they are not empty
   *
   * This method validates the queries to ensure that they are not empty.
   *
   * @param queries - A string or array of strings to search for in the logs
   * @returns An array of valid queries
   *
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * const validQueries = logger.validateQueries(['system1', 'system2'])
   * console.log(validQueries)
   * ```
   */
  private validateQueries(queries: string | string[]): string[] {
    const queryArray = Array.isArray(queries) ? queries : [queries]
    const validQueries = queryArray.filter(
      (query) => query && query.trim().length > 0
    )

    if (validQueries.length === 0) {
      throw new Error('At least one non-empty query is required')
    }

    return validQueries
  }

  /**
   * Builds a search query for the Elasticsearch/OpenSearch cluster
   *
   * This method builds a search query based on the provided queries and search configuration.
   * It returns a search query object that can be used to search for logs in the Elasticsearch/OpenSearch cluster.
   *
   * @param queries - An array of strings to search for in the logs
   * @param searchConfig - The search configuration to use
   * @returns A search query object that can be used to search for logs in the Elasticsearch/OpenSearch cluster
   *
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * const searchQuery = logger.buildSearchQuery(['system1', 'system2'], { index: 'system-logs', fields: ['message', 'service', 'level'] })
   * ```
   */
  private buildSearchQuery(queries: string[], searchConfig: SearchQuery) {
    const shouldClauses = queries.map((query) => ({
      bool: {
        should: searchConfig.fields.map((field) => ({
          match: { [field]: query },
        })),
        minimum_should_match: 1,
      },
    }))

    return {
      index: searchConfig.index,
      body: {
        query: {
          bool: {
            should: shouldClauses,
            minimum_should_match: 1,
          },
        },
      },
    }
  }

  /**
   * Logs a message to the Elasticsearch/OpenSearch cluster
   *
   * This method logs a message to the main index.
   *
   * @param level - The log level (info, warn, error, debug)
   * @param service - The service associated with the log
   * @param message - The message to log
   * @param meta - Optional metadata to include with the log
   * @returns Promise<void> - Returns a promise that resolves when the message is logged
   *
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * await logger.log('info', 'This is an info message')
   * ```
   */
  async log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    if (!message) {
      throw new Error('Message and service are required')
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      environment: this.environment,
      message,
      ...meta,
    }

    try {
      await this.client.index({
        index: this.index,
        body: logEntry,
      })
    } catch (error) {
      await this.processError(error as Error, logEntry)
    }
  }

  /**
   * Logs a transaction to the Elasticsearch/OpenSearch cluster
   *
   * This method logs a transaction to the transactions index.
   *
   * @param transaction - The transaction to log
   * @returns Promise<void> - Returns a promise that resolves when the transaction is logged
   *
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * const transaction = { name: 'transaction1', service: 'service1', status: 'success' }
   * await logger.logTransaction(transaction)
   * console.log('Transaction logged successfully')
   * ```
   */
  async logTransaction(transaction: LogTransaction): Promise<void> {
    if (!transaction.name) {
      throw new Error('Transaction name is required')
    }

    const doc = {
      timestamp: new Date().toISOString(),
      service: this.service,
      environment: this.environment,
      ...transaction,
    }

    try {
      await this.client.index({
        index: `${this.index}-transactions`,
        body: doc,
      })
    } catch (error) {
      await this.processError(error as Error, doc)
    }
  }

  /**
   * Retrieves system logs from the Elasticsearch/OpenSearch cluster
   *
   * This method searches for system logs based on the provided queries.
   * It returns an array of OpenSearchHit objects, which contain the log data.
   *
   * @param queries - A string or array of strings to search for in the system logs
   * @returns Promise<OpenSearchHit[]> - An array of OpenSearchHit objects containing the log data
   *
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * const systemLogs = await logger.getSystemLogs(['system1', 'system2'])
   * console.log(systemLogs)
   * ```
   */
  async getSystemLogs(queries: string | string[]): Promise<OpenSearchHit[]> {
    const validQueries = this.validateQueries(queries)

    const searchConfig: SearchQuery = {
      index: this.index,
      fields: ['message', 'service', 'level'],
    }

    try {
      const response = (await this.client.search(
        this.buildSearchQuery(validQueries, searchConfig)
      )) as OpenSearchResponse
      return response.body.hits.hits
    } catch (error) {
      console.error('Failed to get system logs:', error)
      throw new Error(
        `Failed to get system logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Retrieves transaction logs from the Elasticsearch/OpenSearch cluster
   *
   * This method searches for transaction logs based on the provided queries.
   * It returns an array of OpenSearchHit objects, which contain the log data.
   *
   * @param queries - A string or array of strings to search for in the transaction logs
   * @returns Promise<OpenSearchHit[]> - An array of OpenSearchHit objects containing the log data
   *
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * const transactions = await logger.getLogsTransactions(['transaction1', 'transaction2'])
   * console.log(transactions)
   * ```
   */
  async getLogsTransactions(
    queries: string | string[]
  ): Promise<OpenSearchHit[]> {
    const validQueries = this.validateQueries(queries)

    const searchConfig: SearchQuery = {
      index: `${this.index}-transactions`,
      fields: ['name', 'service', 'status'],
    }

    try {
      const response = (await this.client.search(
        this.buildSearchQuery(validQueries, searchConfig)
      )) as OpenSearchResponse
      return response.body.hits.hits
    } catch (error) {
      console.error('Failed to get transaction logs:', error)
      throw new Error(
        `Failed to get transaction logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Flushes the indices to ensure that the logs are visible
   *
   * This method refreshes both the main index and the transactions index
   * to ensure that the logs are visible in the search results.
   *
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * await logger.flush()
   * console.log('Indices flushed successfully')
   * ```
   */
  async flush(): Promise<void> {
    try {
      await Promise.all([
        this.client.indices.refresh({ index: this.index }),
        this.client.indices.refresh({ index: `${this.index}-transactions` }),
      ])
    } catch (error) {
      console.error('Failed to flush indices:', error)
      throw new Error(
        `Failed to flush indices: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Performs a health check on the Elasticsearch/OpenSearch cluster
   *
   * This method sends a ping request to the configured cluster to verify
   * connectivity and basic cluster health. It's useful for monitoring
   * and ensuring the logging service is available.
   *
   * @returns Promise<boolean> - Returns true if the cluster is reachable and healthy,
   *                            false if the health check fails or cluster is unreachable
   *
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * const isHealthy = await logger.healthCheck()
   * if (isHealthy) {
   *   console.log('Cluster is healthy')
   * } else {
   *   console.log('Cluster health check failed')
   * }
   * ```
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping()
      return true
    } catch (error) {
      console.error('Elasticsearch health check failed:', error)
      return false
    }
  }

  /**
   * Processes an error and logs it to the Elasticsearch/OpenSearch cluster
   *
   * This method processes an error and logs it to the Elasticsearch/OpenSearch cluster.
   * It checks for mapping errors and attempts to fix them.
   *
   * @param error - The error to process
   * @param body - The body to log
   * @returns Promise<void> - Returns a promise that resolves when the error is processed
   *
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * await logger.processError(new Error('Mapping error'), { message: 'Test error' })
   * ```
   */
  async processError(
    error: Error,
    body: Record<string, unknown>
  ): Promise<void> {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    // Check for mapping errors
    if (
      errorMessage.includes('mapper_parsing_exception') ||
      errorMessage.includes('mapping_exception')
    ) {
      console.error('OpenSearch mapping error:', errorMessage)
      console.log('🔄 Attempting to fix index mapping...')

      const mappingResult = await this.checkAndFixIndexMapping()
      if (mappingResult.success) {
        // Retry the log operation
        try {
          await this.client.index({
            index: this.index,
            body,
          })
          console.log('✅ Log message sent successfully after fixing mapping')
          return
        } catch (retryError) {
          console.error('❌ Retry failed after mapping fix:', retryError)
          throw new Error(
            `Mapping fix failed. You may need to recreate the index. Details: ${errorMessage}`
          )
        }
      } else {
        throw new Error(
          `Mapping error detected but could not be fixed: ${mappingResult.error}`
        )
      }
    }

    // Check for authentication/authorization errors
    if (
      errorMessage.includes('security_exception') ||
      errorMessage.includes('authorization_exception') ||
      errorMessage.includes('authentication_exception')
    ) {
      console.error(
        'OpenSearch authentication/authorization error:',
        errorMessage
      )
      throw new Error(
        `OpenSearch authentication failed. Please check your credentials and permissions. Details: ${errorMessage}`
      )
    }

    // Check for connection errors
    if (
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('timeout')
    ) {
      console.error('OpenSearch connection error:', errorMessage)
      throw new Error(
        `Cannot connect to OpenSearch. Please check your connection settings. Details: ${errorMessage}`
      )
    }

    console.error('Failed to log to Elasticsearch:', error)
    throw new Error(`Failed to log to Elasticsearch: ${errorMessage}`)
  }

  /**
   * Tests the connection and authentication to the Elasticsearch/OpenSearch cluster
   *
   * This method tests the connection and authentication to the Elasticsearch/OpenSearch cluster.
   * It returns a boolean indicating whether the connection and authentication are successful.
   *
   * @returns Promise<{ success: boolean; error?: string }> - Returns a promise that resolves to an object containing the success status and any error message
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * const connectionTest = await logger.testConnection()
   * console.log(connectionTest)
   * ```
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test basic connection
      const pingResult = await this.client.ping()
      if (!pingResult.body) {
        return { success: false, error: 'Ping failed - no response body' }
      }

      // Test write permissions by trying to create a test document
      const testIndex = `${this.index}-test-${Date.now()}`
      try {
        await this.client.index({
          index: testIndex,
          id: 'test-connection',
          body: {
            timestamp: new Date().toISOString(),
            message: 'Connection test',
            level: 'info',
          },
        })

        // Clean up test document
        await this.client.delete({
          index: testIndex,
          id: 'test-connection',
        })

        return { success: true }
      } catch (writeError) {
        const writeErrorMessage =
          writeError instanceof Error ? writeError.message : 'Unknown error'

        if (
          writeErrorMessage.includes('security_exception') ||
          writeErrorMessage.includes('authorization_exception')
        ) {
          return {
            success: false,
            error: `Write permission denied. Please check if the user has write access to index: ${this.index}. Details: ${writeErrorMessage}`,
          }
        }

        return {
          success: false,
          error: `Write test failed: ${writeErrorMessage}`,
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: `Connection test failed: ${errorMessage}`,
      }
    }
  }

  /**
   * Validates the logger configuration
   *
   * This method validates the logger configuration to ensure that all required fields are present.
   *
   * @returns { valid: boolean; errors: string[] } - Returns an object containing the validation status and any error messages
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * const validationResult = logger.validateLoggerConfig()
   * console.log(validationResult)
   * ```
   */
  validateLoggerConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.index) errors.push('Index is required')
    if (!this.service) errors.push('Service is required')
    if (!this.environment) errors.push('Environment is required')

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Checks and fixes the index mapping
   *
   * This method checks and fixes the index mapping to ensure that the index is properly configured.
   *
   * @returns Promise<{ success: boolean; error?: string }> - Returns a promise that resolves to an object containing the success status and any error message
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * const mappingResult = await logger.checkAndFixIndexMapping()
   * console.log(mappingResult)
   * ```
   */
  async checkAndFixIndexMapping(): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      // Check if index exists
      const indexExists = await this.client.indices.exists({
        index: this.index,
      })

      if (!indexExists.body) {
        // Create index with proper mapping
        await this.client.indices.create({
          index: this.index,
          body: {
            mappings: {
              properties: {
                timestamp: { type: 'date' },
                level: { type: 'keyword' },
                service: { type: 'keyword' },
                message: { type: 'text' },
                // Allow dynamic mapping for additional fields
                meta: { type: 'object', dynamic: true },
              },
            },
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
            },
          },
        })
        console.log(`✅ Created index ${this.index} with proper mapping`)
        return { success: true }
      }

      // Check current mapping
      const mapping = await this.client.indices.getMapping({
        index: this.index,
      })
      const properties = mapping.body[this.index].mappings.properties

      // Check if message field has correct type
      if (properties.message && properties.message.type !== 'text') {
        console.warn(
          `⚠️ Index ${this.index} has incorrect mapping for 'message' field`
        )
        console.warn(`Current type: ${properties.message.type}, Expected: text`)

        // Try to update mapping (this might fail if there's data)
        try {
          await this.client.indices.putMapping({
            index: this.index,
            body: {
              properties: {
                message: { type: 'text' },
              },
            },
          })
          console.log(`✅ Updated mapping for index ${this.index}`)
          return { success: true }
        } catch (mappingError) {
          const errorMsg =
            mappingError instanceof Error
              ? mappingError.message
              : 'Unknown error'
          return {
            success: false,
            error: `Cannot update mapping. You may need to recreate the index. Details: ${errorMsg}`,
          }
        }
      }

      return { success: true }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: `Failed to check/fix mapping: ${errorMessage}`,
      }
    }
  }

  /**
   * Recreates the index
   *
   * This method recreates the index to ensure that the index is properly configured.
   *
   * @returns Promise<{ success: boolean; error?: string }> - Returns a promise that resolves to an object containing the success status and any error message
   * @example
   * ```typescript
   * const logger = new ElasticLogger(config)
   * const recreateResult = await logger.recreateIndex()
   * console.log(recreateResult)
   * ```
   */
  async recreateIndex(): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete index if exists
      const indexExists = await this.client.indices.exists({
        index: this.index,
      })
      if (indexExists.body) {
        await this.client.indices.delete({ index: this.index })
        console.log(`🗑️ Deleted existing index ${this.index}`)
      }

      // Create new index with proper mapping
      await this.client.indices.create({
        index: this.index,
        body: {
          mappings: {
            properties: {
              timestamp: { type: 'date' },
              level: { type: 'keyword' },
              service: { type: 'keyword' },
              message: { type: 'text' },
              meta: { type: 'object', dynamic: true },
            },
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
        },
      })

      console.log(`✅ Recreated index ${this.index} with proper mapping`)
      return { success: true }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: `Failed to recreate index: ${errorMessage}`,
      }
    }
  }
}
