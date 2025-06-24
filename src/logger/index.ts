import { Client } from '@opensearch-project/opensearch'
import { v4 as uuidv4 } from 'uuid'
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
  private readonly timeout = 30000

  constructor(config: LoggerConfig) {
    this.validateConfig(config)
    this.index = config.index
    this.service = config.service
    this.environment = config.environment
    this.service = config.service

    this.client = new Client({
      node: config.node,
      auth: {
        username: config.username,
        password: config.password,
      },
      ssl: {
        rejectUnauthorized: this.environment === 'production',
      },
      requestTimeout: this.timeout,
      maxRetries: 3,
    })
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
      !config.username ||
      !config.password ||
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
      message,
      ...meta,
    }

    try {
      await this.client.index({
        index: this.index,
        id: uuidv4(),
        body: logEntry,
      })
    } catch (error) {
      console.error('Failed to log to Elasticsearch:', error)
      // In production, you might want to fallback to console.log or another logging mechanism
      throw new Error(
        `Failed to log to Elasticsearch: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
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
        id: uuidv4(),
        body: doc,
      })
    } catch (error) {
      console.error('Failed to log transaction to Elasticsearch:', error)
      throw new Error(
        `Failed to log transaction to Elasticsearch: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
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
}
