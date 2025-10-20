/// <reference types="jest" />
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock Express types for testing
interface Request {
  method: string
  url: string
  originalUrl: string
  ip?: string
  get: (header: string) => string | undefined
  headers: Record<string, string>
  params: Record<string, string>
  query: Record<string, unknown>
  body: Record<string, unknown>
  transactionId?: string
}

interface Response {
  statusCode: number
  send: (data: unknown) => void
  once: (event: string, cb: () => void) => void
  emit: (event: string) => void
  getHeader: (name: string) => number | string | undefined
}

type NextFunction = () => void
import { performanceLoggerMiddleware } from '../middlewares/performance-logger'
import { transactionLoggerMiddleware } from '../middlewares/transaction-logger'
import { ElasticLogger } from '../logger'
import { LoggerConfig } from '../logger/types'

describe('Middlewares', () => {
  const mockConfig: LoggerConfig = {
    node: 'http://localhost:9200',
    username: 'admin',
    password: 'admin',
    index: 'test-logs',
    service: 'test-service',
    environment: 'test',
    region: 'us-east-1',
  }

  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let elasticLogger: ElasticLogger

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/test',
      originalUrl: '/test',
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'test-agent'
        if (header === 'x-transaction-id') return 'test-tx-id'
        return undefined
      }),
      headers: {
        'x-transaction-id': 'test-tx-id',
        'x-user-id': 'user-123',
        authorization: 'Bearer token123',
      },
      params: { id: '123' },
      query: { search: 'test' },
      body: { name: 'test' },
    }

    const listeners: Record<string, Array<() => void>> = {}
    mockRes = {
      statusCode: 200,
      send: jest.fn(function (this: any, _data: unknown) {
        // emula finalização da resposta
        mockRes.emit && mockRes.emit('finish')
      }),
      once: jest.fn((event: string, cb: () => void) => {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(cb)
      }),
      emit: jest.fn((event: string) => {
        ;(listeners[event] || []).forEach((cb) => cb())
        listeners[event] = []
      }),
      getHeader: jest.fn((_name: string) => undefined),
    }

    mockNext = jest.fn()
    elasticLogger = new ElasticLogger(mockConfig)
  })

  describe('performanceLoggerMiddleware', () => {
    it('should create middleware with correct parameters', () => {
      const middleware = performanceLoggerMiddleware(
        'test-service',
        'test-operation',
        'development'
      )

      expect(typeof middleware).toBe('function')
    })

    it('should measure and log performance', async () => {
      const middleware = performanceLoggerMiddleware(
        'test-service',
        'test-operation',
        'development'
      )

      // Mock the logger.info method
      const loggerSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined)

      middleware(mockReq as any, mockRes as any, mockNext)

      // Call the middleware
      await new Promise((resolve) => setTimeout(resolve, 100))
      mockRes.send?.('test response')

      expect(mockNext).toHaveBeenCalled()
      loggerSpy.mockRestore()
    })

    it('should handle different environments', () => {
      const environments = [
        'development',
        'staging',
        'production',
        'test',
      ] as const

      environments.forEach((env) => {
        const middleware = performanceLoggerMiddleware(
          'test-service',
          'test-operation',
          env
        )
        expect(typeof middleware).toBe('function')
      })
    })
  })

  describe('transactionLoggerMiddleware', () => {
    it('should create middleware with correct parameters', () => {
      const middleware = transactionLoggerMiddleware(
        'test-service',
        'test-operation',
        elasticLogger
      )

      expect(typeof middleware).toBe('function')
    })

    it('should create middleware without elastic logger', () => {
      const middleware = transactionLoggerMiddleware(
        'test-service',
        'test-operation',
        null
      )

      expect(typeof middleware).toBe('function')
    })

    it('should capture request metadata and log transaction', async () => {
      const middleware = transactionLoggerMiddleware(
        'test-service',
        'test-operation',
        elasticLogger
      )

      // Mock the elastic logger
      const logTransactionSpy = jest
        .spyOn(elasticLogger, 'logTransaction')
        .mockResolvedValue()

      middleware(mockReq as any, mockRes as any, mockNext)

      // Call the middleware
      mockRes.send?.('test response')

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.transactionId).toBeDefined()
      expect(logTransactionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-operation',
          microservice: 'test-service',
          operation: 'test-operation',
          status: 'success',
          context: expect.objectContaining({
            params: expect.objectContaining({ id: '123' }),
            query: expect.objectContaining({ search: 'test' }),
            body: expect.objectContaining({ name: 'test' }),
          }),
          requestMeta: expect.objectContaining({
            method: 'GET',
            path: '/test',
            // ip e userAgent agora ficam em requestMeta
          }),
        })
      )

      logTransactionSpy.mockRestore()
    })

    it('should handle failed transactions', async () => {
      const middleware = transactionLoggerMiddleware(
        'test-service',
        'test-operation',
        elasticLogger
      )

      // Mock the elastic logger
      const logTransactionSpy = jest
        .spyOn(elasticLogger, 'logTransaction')
        .mockResolvedValue()

      // Set error status
      mockRes.statusCode = 500

      middleware(mockReq as any, mockRes as any, mockNext)

      // Call the middleware
      mockRes.send?.('error response')

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(logTransactionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
        })
      )

      logTransactionSpy.mockRestore()
    })

    it('should filter sensitive data from context', async () => {
      const middleware = transactionLoggerMiddleware(
        'test-service',
        'test-operation',
        elasticLogger
      )

      // Add sensitive data to request
      mockReq.body = {
        name: 'test',
        password: 'secret123',
        token: 'bearer-token',
        secret: 'secret-value',
      }

      mockReq.query = {
        search: 'test',
        token: 'query-token',
        password: 'query-password',
      }

      // Mock the elastic logger
      const logTransactionSpy = jest
        .spyOn(elasticLogger, 'logTransaction')
        .mockResolvedValue()

      middleware(mockReq as any, mockRes as any, mockNext)

      // Call the middleware
      mockRes.send?.('test response')

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 10))

      const callArgs = logTransactionSpy.mock.calls[0]?.[0]
      expect(callArgs?.context).toBeDefined()
      const ctx = (callArgs as any)?.context as Record<string, any>
      expect(ctx['body']).toBeDefined()
      expect(ctx['query']).toBeDefined()
      // Sensitive fields should be masked
      expect(ctx['body']['password']).toBe('[REDACTED]')
      expect(ctx['body']['token']).toBe('[REDACTED]')
      expect(ctx['body']['secret']).toBe('[REDACTED]')
      expect(ctx['query']['password']).toBe('[REDACTED]')
      expect(ctx['query']['token']).toBe('[REDACTED]')

      logTransactionSpy.mockRestore()
    })

    it('should generate transaction ID when not provided', async () => {
      const middleware = transactionLoggerMiddleware(
        'test-service',
        'test-operation',
        elasticLogger
      )

      // Remove transaction ID from headers
      mockReq.headers = {}
      mockReq.get = jest.fn(() => undefined)

      // Mock the elastic logger
      const logTransactionSpy = jest
        .spyOn(elasticLogger, 'logTransaction')
        .mockResolvedValue()

      middleware(mockReq as any, mockRes as any, mockNext)

      // Call the middleware
      mockRes.send?.('test response')

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockReq.transactionId).toBeDefined()
      expect(mockReq.transactionId).toMatch(/^tx_\d+_[a-z0-9]+$/)

      logTransactionSpy.mockRestore()
    })

    it('should handle middleware without elastic logger gracefully', () => {
      const middleware = transactionLoggerMiddleware(
        'test-service',
        'test-operation',
        null
      )

      // Should not throw
      expect(() => {
        middleware(mockReq as any, mockRes as any, mockNext)
      }).not.toThrow()

      expect(mockNext).toHaveBeenCalled()
    })
  })
})
