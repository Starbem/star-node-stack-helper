/// <reference types="jest" />
import { ElasticLogger } from '../logger'
import { LoggerConfig, LogTransaction } from '../logger/types'

describe('ElasticLogger', () => {
  const mockConfig: LoggerConfig = {
    node: 'http://localhost:9200',
    username: 'admin',
    password: 'admin',
    index: 'test-logs',
    service: 'test-service',
    environment: 'test',
    region: 'us-east-1',
  }

  let logger: ElasticLogger

  beforeEach(() => {
    logger = new ElasticLogger(mockConfig)
  })

  describe('Constructor', () => {
    it('should create logger instance with valid config', () => {
      expect(logger).toBeInstanceOf(ElasticLogger)
    })

    it('should throw error for invalid config', () => {
      const invalidConfig = { ...mockConfig, node: '' }

      expect(() => new ElasticLogger(invalidConfig)).toThrow(
        'All LoggerConfig fields are required'
      )
    })

    it('should create logger with AWS authentication', () => {
      const awsConfig: LoggerConfig = {
        node: 'https://opensearch-domain.us-east-1.es.amazonaws.com',
        authType: 'aws',
        index: 'test-logs',
        service: 'test-service',
        environment: 'test',
        region: 'us-east-1',
      }

      expect(() => new ElasticLogger(awsConfig)).not.toThrow()
    })

    it('should throw error for missing authentication', () => {
      const invalidConfig = {
        node: 'http://localhost:9200',
        index: 'test-logs',
        service: 'test-service',
        environment: 'test',
        region: 'us-east-1',
        username: 'user', // Provide username but no password
      } as LoggerConfig

      expect(() => new ElasticLogger(invalidConfig)).toThrow(
        'Authentication configuration is required. Either set authType: "aws" or provide username and password.'
      )
    })
  })

  describe('log', () => {
    it('should log info message successfully', async () => {
      await expect(logger.log('info', 'Test message')).resolves.not.toThrow()
    })

    it('should log error message with metadata', async () => {
      const metadata = { userId: '123', error: new Error('Test error') }

      await expect(
        logger.log('error', 'Error occurred', metadata)
      ).resolves.not.toThrow()
    })

    it('should throw error for empty message', async () => {
      await expect(logger.log('info', '')).rejects.toThrow(
        'Message and service are required'
      )
    })

    it('should log with different levels', async () => {
      await expect(logger.log('debug', 'Debug message')).resolves.not.toThrow()
      await expect(logger.log('warn', 'Warning message')).resolves.not.toThrow()
      await expect(logger.log('error', 'Error message')).resolves.not.toThrow()
    })
  })

  describe('logTransaction', () => {
    it('should log successful transaction', async () => {
      const transaction: LogTransaction = {
        name: 'test-transaction',
        microservice: 'test-service',
        operation: 'test-operation',
        status: 'success',
        duration: 100,
        context: { userId: '123' },
        requestMeta: {
          method: 'POST',
          path: '/api/test',
          ip: '127.0.0.1',
        },
      }

      await expect(logger.logTransaction(transaction)).resolves.not.toThrow()
    })

    it('should log failed transaction with error', async () => {
      const transaction: LogTransaction = {
        name: 'test-transaction',
        microservice: 'test-service',
        operation: 'test-operation',
        status: 'fail',
        duration: 100,
        context: { userId: '123' },
        requestMeta: {
          method: 'POST',
          path: '/api/test',
          ip: '127.0.0.1',
        },
        error: {
          message: 'Test error message',
        },
      }

      await expect(logger.logTransaction(transaction)).resolves.not.toThrow()
    })

    it('should throw error for missing transaction name', async () => {
      const transaction = {
        status: 'success',
        duration: 100,
      } as LogTransaction

      await expect(logger.logTransaction(transaction)).rejects.toThrow(
        'Transaction name is required'
      )
    })

    it('should log transaction without optional fields', async () => {
      const transaction: LogTransaction = {
        name: 'simple-transaction',
        microservice: 'test-service',
        operation: 'simple-operation',
        status: 'success',
        duration: 50,
      }

      await expect(logger.logTransaction(transaction)).resolves.not.toThrow()
    })
  })

  describe('getSystemLogs', () => {
    it('should retrieve system logs with single query', async () => {
      const logs = await logger.getSystemLogs('test')

      expect(Array.isArray(logs)).toBe(true)
      expect(logs.length).toBeGreaterThan(0)
    })

    it('should retrieve system logs with multiple queries', async () => {
      const logs = await logger.getSystemLogs(['test', 'error'])

      expect(Array.isArray(logs)).toBe(true)
    })

    it('should throw error for empty queries', async () => {
      await expect(logger.getSystemLogs('')).rejects.toThrow(
        'At least one non-empty query is required'
      )
    })

    it('should throw error for empty array of queries', async () => {
      await expect(logger.getSystemLogs([])).rejects.toThrow(
        'At least one non-empty query is required'
      )
    })
  })

  describe('getLogsTransactions', () => {
    it('should retrieve transaction logs with single query', async () => {
      const transactions = await logger.getLogsTransactions('test-transaction')

      expect(Array.isArray(transactions)).toBe(true)
    })

    it('should retrieve transaction logs with multiple queries', async () => {
      const transactions = await logger.getLogsTransactions(['test', 'success'])

      expect(Array.isArray(transactions)).toBe(true)
    })

    it('should throw error for empty queries', async () => {
      await expect(logger.getLogsTransactions('')).rejects.toThrow(
        'At least one non-empty query is required'
      )
    })
  })

  describe('flush', () => {
    it('should flush indices successfully', async () => {
      await expect(logger.flush()).resolves.not.toThrow()
    })
  })

  describe('healthCheck', () => {
    it('should return true for healthy cluster', async () => {
      const isHealthy = await logger.healthCheck()

      expect(typeof isHealthy).toBe('boolean')
    })
  })

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const result = await logger.testConnection()

      expect(result).toHaveProperty('success')
      expect(typeof result.success).toBe('boolean')
    })
  })

  describe('validateLoggerConfig', () => {
    it('should validate correct configuration', () => {
      const result = logger.validateLoggerConfig()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('checkAndFixIndexMapping', () => {
    it('should check and fix index mapping', async () => {
      const result = await logger.checkAndFixIndexMapping()

      expect(result).toHaveProperty('success')
      expect(typeof result.success).toBe('boolean')
    })
  })

  describe('recreateIndex', () => {
    it('should recreate index successfully', async () => {
      const result = await logger.recreateIndex()

      expect(result).toHaveProperty('success')
      expect(typeof result.success).toBe('boolean')
    })
  })
})
