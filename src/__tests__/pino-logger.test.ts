/// <reference types="jest" />
import { createPinoLogger, createHttpLogger, logContext } from '../logger-pino'
import { PinoLoggerConfig } from '../logger-pino/types'

describe('Pino Logger', () => {
  const mockConfig: PinoLoggerConfig = {
    serviceName: 'test-service',
    environment: 'test',
    logLevel: 'info',
  }

  describe('createPinoLogger', () => {
    it('should create logger with valid config', () => {
      const logger = createPinoLogger(mockConfig)

      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.debug).toBe('function')
    })

    it('should create logger with different environments', () => {
      const environments = [
        'development',
        'staging',
        'production',
        'test',
      ] as const

      environments.forEach((env) => {
        const config = { ...mockConfig, environment: env }
        const logger = createPinoLogger(config)

        expect(logger).toBeDefined()
      })
    })

    it('should create logger with different log levels', () => {
      const levels = [
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
      ] as const

      levels.forEach((level) => {
        const config = { ...mockConfig, logLevel: level }
        const logger = createPinoLogger(config)

        expect(logger).toBeDefined()
      })
    })

    it('should create logger with custom formatters', () => {
      const config: PinoLoggerConfig = {
        ...mockConfig,
        customFormatters: {
          level: (label: string) => ({ level: label.toUpperCase() }),
          log: (object: any) => ({ ...object, custom: true }),
        },
      }

      const logger = createPinoLogger(config)

      expect(logger).toBeDefined()
    })

    it('should create logger with custom serializers', () => {
      const config: PinoLoggerConfig = {
        ...mockConfig,
        customSerializers: {
          req: (req: any) => ({ method: req.method, url: req.url }),
          res: (res: any) => ({ statusCode: res.statusCode }),
          err: (err: any) => ({ message: err.message }),
        },
      }

      const logger = createPinoLogger(config)

      expect(logger).toBeDefined()
    })

    it('should create logger with custom redact paths', () => {
      const config: PinoLoggerConfig = {
        ...mockConfig,
        environment: 'production',
        customRedactPaths: ['custom.secret', 'custom.token'],
      }

      const logger = createPinoLogger(config)

      expect(logger).toBeDefined()
    })
  })

  describe('createHttpLogger', () => {
    let logger: any

    beforeEach(() => {
      logger = createPinoLogger(mockConfig)
    })

    it('should create HTTP logger middleware', () => {
      const httpLogger = createHttpLogger(logger)

      expect(httpLogger).toBeDefined()
      expect(typeof httpLogger).toBe('function')
    })

    it('should create HTTP logger with custom options', () => {
      const options = {
        silentRoutes: ['/health', '/metrics'],
        customLogLevel: (_req: any, res: any, err?: any) => {
          if (err) return 'error'
          if (res.statusCode >= 400) return 'warn'
          return 'info'
        },
        customSuccessMessage: (req: any, res: any) =>
          `${req.method} ${req.url} - ${res.statusCode}`,
        customErrorMessage: (req: any, res: any, err?: any) =>
          `${req.method} ${req.url} - ${res.statusCode} - ${err?.message}`,
      }

      const httpLogger = createHttpLogger(logger, options)

      expect(httpLogger).toBeDefined()
    })
  })

  describe('logContext', () => {
    const mockReq = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'test-agent'
        return undefined
      }),
    }

    const mockError = new Error('Test error')
    mockError.stack = 'Error: Test error\n    at test.js:1:1'

    describe('request', () => {
      it('should create request context', () => {
        const context = logContext.request(mockReq)

        expect(context).toEqual({
          method: 'GET',
          url: '/test',
          userAgent: 'test-agent',
          ip: '127.0.0.1',
        })
      })

      it('should create request context with additional data', () => {
        const additionalData = { userId: '123', sessionId: 'sess-456' }
        const context = logContext.request(mockReq, additionalData)

        expect(context).toEqual({
          method: 'GET',
          url: '/test',
          userAgent: 'test-agent',
          ip: '127.0.0.1',
          userId: '123',
          sessionId: 'sess-456',
        })
      })

      it('should handle missing User-Agent', () => {
        const reqWithoutUA = { ...mockReq, get: jest.fn(() => undefined) }
        const context = logContext.request(reqWithoutUA)

        expect(context).toEqual({
          method: 'GET',
          url: '/test',
          userAgent: undefined,
          ip: '127.0.0.1',
        })
      })
    })

    describe('error', () => {
      it('should create error context', () => {
        const context = logContext.error(mockError)

        expect(context).toEqual({
          message: 'Test error',
          stack: 'Error: Test error\n    at test.js:1:1',
          code: undefined,
        })
      })

      it('should create error context with additional data', () => {
        const additionalData = { userId: '123', operation: 'test-op' }
        const context = logContext.error(mockError, additionalData)

        expect(context).toEqual({
          message: 'Test error',
          stack: 'Error: Test error\n    at test.js:1:1',
          code: undefined,
          userId: '123',
          operation: 'test-op',
        })
      })

      it('should handle error with code', () => {
        const errorWithCode = new Error('Test error')
        ;(errorWithCode as any).code = 'TEST_ERROR'
        errorWithCode.stack = 'Error: Test error\n    at test.js:1:1'

        const context = logContext.error(errorWithCode)

        expect(context).toEqual({
          message: 'Test error',
          stack: 'Error: Test error\n    at test.js:1:1',
          code: 'TEST_ERROR',
        })
      })
    })

    describe('performance', () => {
      it('should create performance context', () => {
        const context = logContext.performance('test-operation', 150)

        expect(context).toEqual({
          operation: 'test-operation',
          duration: 150,
          unit: 'ms',
        })
      })

      it('should create performance context with metadata', () => {
        const metadata = { userId: '123', resource: 'user' }
        const context = logContext.performance('test-operation', 150, metadata)

        expect(context).toEqual({
          operation: 'test-operation',
          duration: 150,
          unit: 'ms',
          userId: '123',
          resource: 'user',
        })
      })

      it('should handle zero duration', () => {
        const context = logContext.performance('instant-operation', 0)

        expect(context).toEqual({
          operation: 'instant-operation',
          duration: 0,
          unit: 'ms',
        })
      })
    })
  })

  describe('Logger functionality', () => {
    let logger: any

    beforeEach(() => {
      logger = createPinoLogger(mockConfig)
    })

    it('should log different levels', () => {
      // Pino logger doesn't use console.log directly, so we just test that methods exist and don't throw
      expect(() => {
        logger.info('Info message')
        logger.warn('Warning message')
        logger.error('Error message')
        logger.debug('Debug message')
      }).not.toThrow()
    })

    it('should log with structured data', () => {
      const structuredData = {
        userId: '123',
        action: 'login',
        timestamp: new Date().toISOString(),
      }

      // Test that structured logging doesn't throw
      expect(() => {
        logger.info('User action', structuredData)
      }).not.toThrow()
    })

    it('should handle error logging', () => {
      const error = new Error('Test error')
      const context = { userId: '123', operation: 'test' }

      // Test that error logging doesn't throw
      expect(() => {
        logger.error('Operation failed', { error, ...context })
      }).not.toThrow()
    })
  })
})
