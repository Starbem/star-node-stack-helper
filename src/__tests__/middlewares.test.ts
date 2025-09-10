/// <reference types="jest" />

// Mock Express types for testing
interface Request {
  method: string
  url: string
  originalUrl: string
  ip?: string
  get: (header: string) => string | undefined
  headers: Record<string, string>
  params: Record<string, string>
  query: Record<string, any>
  body: Record<string, any>
  transactionId?: string
}

interface Response {
  statusCode: number
  send: (data: any) => void
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

    mockRes = {
      statusCode: 200,
      send: jest.fn(),
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
      const loggerSpy = jest.spyOn(console, 'log').mockImplementation()

      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Simulate response
      const originalSend = mockRes.send
      mockRes.send = jest.fn((data: any) => {
        originalSend?.call(mockRes, data)
      })

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

      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Simulate response
      const originalSend = mockRes.send
      mockRes.send = jest.fn((data: any) => {
        originalSend?.call(mockRes, data)
      })

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
            id: '123',
            search: 'test',
            name: 'test',
          }),
          requestMeta: expect.objectContaining({
            method: 'GET',
            path: '/test',
            ip: '127.0.0.1',
            userAgent: 'test-agent',
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

      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Simulate response
      const originalSend = mockRes.send
      mockRes.send = jest.fn((data: any) => {
        originalSend?.call(mockRes, data)
      })

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

      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Simulate response
      const originalSend = mockRes.send
      mockRes.send = jest.fn((data: any) => {
        originalSend?.call(mockRes, data)
      })

      // Call the middleware
      mockRes.send?.('test response')

      // Wait for async logging
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(logTransactionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            name: 'test',
            search: 'test',
            // Sensitive fields should be filtered out
          }),
        })
      )

      // Verify sensitive fields are not in context
      const callArgs = logTransactionSpy.mock.calls[0]?.[0]
      expect(callArgs?.context).not.toHaveProperty('password')
      expect(callArgs?.context).not.toHaveProperty('token')
      expect(callArgs?.context).not.toHaveProperty('secret')

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

      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Simulate response
      const originalSend = mockRes.send
      mockRes.send = jest.fn((data: any) => {
        originalSend?.call(mockRes, data)
      })

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
        middleware(mockReq as Request, mockRes as Response, mockNext)
      }).not.toThrow()

      expect(mockNext).toHaveBeenCalled()
    })
  })
})
