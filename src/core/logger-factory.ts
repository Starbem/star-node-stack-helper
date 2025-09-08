import { ElasticLogger } from '../logger'
import { SystemLogger, setSystemLogger } from './system-logger'
import { PinoLogger, initializePinoLogger, getPinoConfig } from './pino-logger'
import { NewLoggerConfig, LoggerInitializationResult } from '../types/system'

export class LoggerFactory {
  private static elasticLogger: ElasticLogger | null = null
  private static systemLogger: SystemLogger | null = null
  private static pinoLogger: PinoLogger | null = null
  private static isInitialized = false

  /**
   * @name initialize
   * @description Initialize the logging system
   */
  static async initialize(
    config: NewLoggerConfig
  ): Promise<LoggerInitializationResult> {
    try {
      const pinoConfig = getPinoConfig(config.service.environment)
      pinoConfig.service = config.service.name
      this.pinoLogger = initializePinoLogger(pinoConfig)

      const elasticConfig: any = {
        node: config.opensearch.node,
        region: config.opensearch.region || 'us-east-2',
        index: config.service.index || `${config.service.name}-logs`,
        authType: config.authType,
        service: config.service.name,
        environment: config.service.environment,
      }

      if (config.opensearch.username) {
        elasticConfig.username = config.opensearch.username
      }
      if (config.opensearch.password) {
        elasticConfig.password = config.opensearch.password
      }

      this.elasticLogger = new ElasticLogger(elasticConfig)
      this.systemLogger = new SystemLogger(this.elasticLogger)

      setSystemLogger(this.systemLogger)

      const connectionTest = await this.elasticLogger.testConnection()
      if (!connectionTest.success) {
        this.pinoLogger?.warn('OpenSearch connection failed', {
          error: connectionTest.error,
        })
        return {
          elasticLogger: this.elasticLogger,
          systemLogger: this.systemLogger,
          pinoLogger: this.pinoLogger,
          success: false,
          error: connectionTest.error || 'Connection test failed',
        }
      }

      const configValidation = this.elasticLogger.validateLoggerConfig()
      if (!configValidation.valid) {
        this.pinoLogger?.warn('Configuração do logger inválida', {
          errors: configValidation.errors,
        })
        return {
          elasticLogger: this.elasticLogger,
          systemLogger: this.systemLogger,
          pinoLogger: this.pinoLogger,
          success: false,
          error: configValidation.errors.join(', '),
        }
      }

      this.isInitialized = true
      this.pinoLogger?.info('LoggerFactory inicializado com sucesso')

      return {
        elasticLogger: this.elasticLogger,
        systemLogger: this.systemLogger,
        pinoLogger: this.pinoLogger,
        success: true,
      }
    } catch (error) {
      this.pinoLogger?.error(
        'Erro ao inicializar LoggerFactory',
        error as Error
      )
      return {
        elasticLogger: this.elasticLogger,
        systemLogger: this.systemLogger,
        pinoLogger: this.pinoLogger,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * @name getSystemLogger
   * @description Get SystemLogger instance from LoggerFactory
   */
  static getSystemLogger(): SystemLogger {
    if (!this.systemLogger) {
      throw new Error(
        'SystemLogger not initialized. Call LoggerFactory.initialize() first.'
      )
    }
    return this.systemLogger
  }

  /**
   * @name getElasticLogger
   * @description Get ElasticLogger instance from LoggerFactory
   */
  static getElasticLogger(): ElasticLogger {
    if (!this.elasticLogger) {
      throw new Error(
        'ElasticLogger not initialized. Call LoggerFactory.initialize() first.'
      )
    }
    return this.elasticLogger
  }

  /**
   * @name getPinoLogger
   * @description Get PinoLogger instance from LoggerFactory
   */
  static getPinoLogger(): PinoLogger {
    if (!this.pinoLogger) {
      throw new Error(
        'PinoLogger not initialized. Call LoggerFactory.initialize() first.'
      )
    }
    return this.pinoLogger
  }

  /**
   * @name isLoggerInitialized
   * @description Check if factory was initialized
   */
  static isLoggerInitialized(): boolean {
    return this.isInitialized
  }

  /**
   * @name checkHealth
   * @description Check OpenSearch cluster health
   */
  static async checkHealth(): Promise<boolean> {
    if (!this.elasticLogger) {
      return false
    }
    return await this.elasticLogger.healthCheck()
  }

  /**
   * @name reset
   * @description Clear instances (useful for tests)
   */
  static reset(): void {
    this.elasticLogger = null
    this.systemLogger = null
    this.pinoLogger = null
    this.isInitialized = false
  }
}

/**
 * @name getEnvironmentConfig
 * @description Convenience function to get environment-based configuration
 */
export function getEnvironmentConfig(env: string): NewLoggerConfig {
  const baseConfig = {
    service: {
      name: process.env['SERVICE_NAME'] || 'unknown-service',
      environment: env,
    },
    logging: {
      level: (process.env['LOG_LEVEL'] as any) || 'info',
      enableTransactionLogs: true,
      enableSystemLogs: true,
      sensitiveFields: [
        'password',
        'token',
        'secret',
        'authorization',
        'creditCard',
        'api_key',
      ],
    },
  }

  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        opensearch: {
          node: 'https://localhost:9200',
          username: 'admin',
          password: 'admin',
          region: 'us-east-1',
        },
        logging: {
          ...baseConfig.logging,
          level: 'debug',
        },
      }

    case 'production':
    case 'staging':
      return {
        ...baseConfig,
        opensearch: {
          node: process.env['OPENSEARCH_NODE']!,
          username: process.env['OPENSEARCH_USERNAME']!,
          password: process.env['OPENSEARCH_PASSWORD']!,
          region: process.env['AWS_REGION']!,
        },
        logging: {
          ...baseConfig.logging,
          level: 'info',
        },
      }

    default:
      throw new Error(`Unknown environment: ${env}`)
  }
}

/**
 * @name initializeLogger
 * @description Convenience function for quick initialization
 */
export async function initializeLogger(
  serviceName: string,
  environment: string = process.env['NODE_ENV'] || 'development'
): Promise<LoggerInitializationResult> {
  const config = getEnvironmentConfig(environment)
  config.service.name = serviceName
  return await LoggerFactory.initialize(config)
}
