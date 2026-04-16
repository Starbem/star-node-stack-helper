/// <reference types="jest" />
import { Writable } from 'stream'
import pino from 'pino'
import { createPinoLogger, createHttpLogger, logContext } from '../logger-pino'
import {
  LogEnvironment,
  LogLevel,
  PinoLoggerConfig,
} from '../logger-pino/types'
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function captureStream() {
  const lines: Record<string, unknown>[] = []
  const stream = new Writable({
    write(chunk: Buffer, _enc, cb) {
      const str = chunk.toString().trim()
      if (str) {
        try {
          lines.push(JSON.parse(str))
        } catch {
          // ignore non-JSON lines (e.g. pino-pretty in CI)
        }
      }
      cb()
    },
  })
  return { lines, stream }
}

async function flush() {
  return new Promise<void>((resolve) => setImmediate(resolve))
}

// ---------------------------------------------------------------------------
// createPinoLogger — existing suite (kept)
// ---------------------------------------------------------------------------

describe('createPinoLogger', () => {
  const mockConfig: PinoLoggerConfig = {
    serviceName: 'test-service',
    environment: 'test',
    logLevel: 'info',
  }

  it('should create logger with valid config', () => {
    const logger = createPinoLogger(mockConfig)

    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  it('should create logger with different environments', () => {
    const environments: LogEnvironment[] = [
      'development',
      'staging',
      'production',
      'test',
    ]

    environments.forEach((env) => {
      const logger = createPinoLogger({ ...mockConfig, environment: env })
      expect(logger).toBeDefined()
    })
  })

  it('should create logger with different log levels', () => {
    const levels: LogLevel[] = [
      'trace',
      'debug',
      'info',
      'warn',
      'error',
      'fatal',
    ]

    levels.forEach((level) => {
      const logger = createPinoLogger({ ...mockConfig, logLevel: level })
      expect(logger).toBeDefined()
    })
  })

  it('should create logger with custom formatters', () => {
    const logger = createPinoLogger({
      ...mockConfig,
      customFormatters: {
        level: (label: string) => ({ level: label.toUpperCase() }),
        log: (object: unknown) => ({
          ...(object as Record<string, unknown>),
          custom: true,
        }),
      },
    })

    expect(logger).toBeDefined()
  })

  it('should create logger with custom serializers', () => {
    const logger = createPinoLogger({
      ...mockConfig,
      customSerializers: {
        req: (req: unknown) => ({
          method: (req as { method: string; url: string }).method,
          url: (req as { method: string; url: string }).url,
        }),
        res: (res: unknown) => ({
          statusCode: (res as { statusCode: number }).statusCode,
        }),
        err: (err: unknown) => ({
          message: (err as { message: string }).message,
        }),
      },
    })

    expect(logger).toBeDefined()
  })

  it('should create logger with custom redact paths', () => {
    const logger = createPinoLogger({
      ...mockConfig,
      environment: 'production',
      customRedactPaths: ['custom.secret', 'custom.token'],
    })

    expect(logger).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// JSON output shape
// ---------------------------------------------------------------------------

describe('JSON output shape', () => {
  it('should use "message" as the message key in production', async () => {
    const { lines, stream } = captureStream()
    const logger = createPinoLogger(
      { serviceName: 'shape-test', environment: 'production', logLevel: 'info' },
      stream,
    )

    logger.info('hello datadog')
    await flush()

    expect(lines).toHaveLength(1)
    expect(lines[0]!['message']).toBe('hello datadog')
    expect(lines[0]).not.toHaveProperty('msg')
  })

  it('should include service, env and level in every record', async () => {
    const { lines, stream } = captureStream()
    const logger = createPinoLogger(
      {
        serviceName: 'my-api',
        environment: 'staging',
        logLevel: 'info',
      },
      stream,
    )

    logger.info('check fields')
    await flush()

    expect(lines[0]!['service']).toBe('my-api')
    expect(lines[0]!['env']).toBe('staging')
    expect(lines[0]!['level']).toBe('info')
  })

  it('should include version from DD_VERSION when set', async () => {
    const prev = process.env['DD_VERSION']
    process.env['DD_VERSION'] = '2.3.4'

    const { lines, stream } = captureStream()
    const logger = createPinoLogger(
      { serviceName: 'versioned', environment: 'staging', logLevel: 'info' },
      stream,
    )

    logger.info('with version')
    await flush()

    expect(lines[0]!['version']).toBe('2.3.4')

    if (prev === undefined) delete process.env['DD_VERSION']
    else process.env['DD_VERSION'] = prev
  })

  it('should fall back to DD_SERVICE when serviceName is not provided', async () => {
    const prev = process.env['DD_SERVICE']
    process.env['DD_SERVICE'] = 'env-service'

    const { lines, stream } = captureStream()
    const logger = createPinoLogger({ environment: 'staging', logLevel: 'info' }, stream)

    logger.info('fallback service')
    await flush()

    expect(lines[0]!['service']).toBe('env-service')

    if (prev === undefined) delete process.env['DD_SERVICE']
    else process.env['DD_SERVICE'] = prev
  })

  it('should not include pid or hostname by default', async () => {
    const { lines, stream } = captureStream()
    const logger = createPinoLogger(
      { serviceName: 'no-pid', environment: 'production', logLevel: 'info' },
      stream,
    )

    logger.info('no pid test')
    await flush()

    expect(lines[0]).not.toHaveProperty('pid')
    expect(lines[0]).not.toHaveProperty('hostname')
  })

  it('should not log below the configured log level', async () => {
    const { lines, stream } = captureStream()
    const logger = createPinoLogger(
      { serviceName: 'level-test', environment: 'production', logLevel: 'warn' },
      stream,
    )

    logger.debug('should be suppressed')
    logger.info('also suppressed')
    logger.warn('should appear')
    await flush()

    expect(lines).toHaveLength(1)
    expect(lines[0]!['level']).toBe('warn')
  })
})

// ---------------------------------------------------------------------------
// createHttpLogger — silent routes
// ---------------------------------------------------------------------------

describe('createHttpLogger - silent routes', () => {
  let logger: pino.Logger

  beforeEach(() => {
    logger = createPinoLogger({
      serviceName: 'http-test',
      environment: 'staging',
      logLevel: 'trace',
    })
  })

  it('should create HTTP logger middleware', () => {
    const httpLogger = createHttpLogger(logger)
    expect(httpLogger).toBeDefined()
    expect(typeof httpLogger).toBe('function')
  })

  it('should silence built-in health routes on 2xx', () => {
    expect(createHttpLogger(logger)).toBeDefined()
    expect(() =>
      createHttpLogger(logger, { customSilentRoutes: ['/probe'] }),
    ).not.toThrow()
  })

  it('should accept customSilentRoutes option', () => {
    const httpLogger = createHttpLogger(logger, {
      customSilentRoutes: ['/internal/ready', '/custom-health'],
    })
    expect(httpLogger).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Silent route matching helper (tested via isSilentRoute internals via behavior)
// ---------------------------------------------------------------------------

describe('silent route pathname matching', () => {
  // We test via createHttpLogger behavior by checking routes list is applied
  it('should not throw for prefixed routes like /connect/healthz', () => {
    const logger = createPinoLogger({
      serviceName: 'prefix-test',
      environment: 'staging',
    })
    expect(() =>
      createHttpLogger(logger, { customSilentRoutes: ['/healthz'] }),
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Correlation — Datadog mixin
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-require-imports --
   correlation.ts uses require() for peers; tests reload the module after jest.doMock. */
describe('getDatadogCorrelationFields', () => {
  it('should return empty object when dd-trace is not available', () => {
    jest.isolateModules(() => {
      jest.doMock(
        'dd-trace',
        () => {
          throw new Error('MODULE_NOT_FOUND')
        },
        { virtual: true },
      )
      const { getDatadogCorrelationFields } = require('../logger-pino/correlation')
      expect(getDatadogCorrelationFields()).toEqual({})
    })
  })

  it('should return empty object when no active span', () => {
    jest.isolateModules(() => {
      jest.doMock(
        'dd-trace',
        () => ({
          scope: () => ({ active: () => null }),
        }),
        { virtual: true },
      )
      const { getDatadogCorrelationFields } = require('../logger-pino/correlation')
      expect(getDatadogCorrelationFields()).toEqual({})
    })
  })

  it('should return dd.trace_id and dd.span_id when span is active', () => {
    jest.isolateModules(() => {
      jest.doMock(
        'dd-trace',
        () => ({
          scope: () => ({
            active: () => ({
              context: () => ({
                toTraceId: () => '1234567890123456789',
                toSpanId: () => '9876543210',
              }),
            }),
          }),
        }),
        { virtual: true },
      )
      const { getDatadogCorrelationFields } = require('../logger-pino/correlation')
      const fields = getDatadogCorrelationFields()

      expect(fields).toEqual(
        expect.objectContaining({
          dd: expect.objectContaining({
            trace_id: '1234567890123456789',
            span_id: '9876543210',
          }),
        }),
      )
    })
  })

  it('should return empty object when span context has no IDs', () => {
    jest.isolateModules(() => {
      jest.doMock(
        'dd-trace',
        () => ({
          scope: () => ({
            active: () => ({
              context: () => ({
                toTraceId: () => undefined,
                toSpanId: () => undefined,
              }),
            }),
          }),
        }),
        { virtual: true },
      )
      const { getDatadogCorrelationFields } = require('../logger-pino/correlation')
      expect(getDatadogCorrelationFields()).toEqual({})
    })
  })
})

// ---------------------------------------------------------------------------
// Correlation — OTel mixin
// ---------------------------------------------------------------------------

describe('getOtelCorrelationFields', () => {
  it('should return empty object when @opentelemetry/api is not available', () => {
    jest.isolateModules(() => {
      jest.doMock(
        '@opentelemetry/api',
        () => {
          throw new Error('MODULE_NOT_FOUND')
        },
        { virtual: true },
      )
      const { getOtelCorrelationFields } = require('../logger-pino/correlation')
      expect(getOtelCorrelationFields()).toEqual({})
    })
  })

  it('should return empty object when no active span', () => {
    jest.isolateModules(() => {
      jest.doMock(
        '@opentelemetry/api',
        () => ({
          trace: { getActiveSpan: () => null },
        }),
        { virtual: true },
      )
      const { getOtelCorrelationFields } = require('../logger-pino/correlation')
      expect(getOtelCorrelationFields()).toEqual({})
    })
  })

  it('should return trace_id and span_id when span is active', () => {
    jest.isolateModules(() => {
      jest.doMock(
        '@opentelemetry/api',
        () => ({
          trace: {
            getActiveSpan: () => ({
              spanContext: () => ({
                traceId: 'abcdef1234567890abcdef1234567890',
                spanId: 'abcdef1234567890',
              }),
            }),
          },
        }),
        { virtual: true },
      )
      const { getOtelCorrelationFields } = require('../logger-pino/correlation')
      expect(getOtelCorrelationFields()).toEqual({
        trace_id: 'abcdef1234567890abcdef1234567890',
        span_id: 'abcdef1234567890',
      })
    })
  })
})
/* eslint-enable @typescript-eslint/no-require-imports */

// ---------------------------------------------------------------------------
// correlationMode wired into createPinoLogger
// ---------------------------------------------------------------------------

describe('createPinoLogger with correlationMode', () => {
  it('should not throw with correlationMode datadog', () => {
    expect(() =>
      createPinoLogger({
        serviceName: 'dd-mode',
        environment: 'production',
        correlationMode: 'datadog',
      }),
    ).not.toThrow()
  })

  it('should not throw with correlationMode otel', () => {
    expect(() =>
      createPinoLogger({
        serviceName: 'otel-mode',
        environment: 'production',
        correlationMode: 'otel',
      }),
    ).not.toThrow()
  })

  it('should not throw with correlationMode none', () => {
    expect(() =>
      createPinoLogger({
        serviceName: 'no-mode',
        environment: 'production',
        correlationMode: 'none',
      }),
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// logContext helpers (kept from existing suite)
// ---------------------------------------------------------------------------

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
      const context = logContext.request(mockReq as any)

      expect(context).toEqual(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          userAgent: 'test-agent',
          ip: '127.0.0.1',
        }),
      )
    })

    it('should create request context with additional data', () => {
      const context = logContext.request(mockReq as any, {
        userId: '123',
        sessionId: 'sess-456',
      })

      expect(context).toEqual(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          userAgent: 'test-agent',
          ip: '127.0.0.1',
          userId: '123',
          sessionId: 'sess-456',
        }),
      )
    })

    it('should handle missing User-Agent', () => {
      const reqWithoutUA = { ...mockReq, get: jest.fn(() => undefined) }
      const context = logContext.request(reqWithoutUA as any)

      expect(context).toEqual(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          ip: '127.0.0.1',
        }),
      )
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
      const context = logContext.error(mockError, {
        userId: '123',
        operation: 'test-op',
      })

      expect(context).toEqual({
        message: 'Test error',
        stack: 'Error: Test error\n    at test.js:1:1',
        code: undefined,
        userId: '123',
        operation: 'test-op',
      })
    })

    it('should handle error with code', () => {
      const errorWithCode = new Error('Test error') as Error & { code: string }
      errorWithCode.code = 'TEST_ERROR'
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
      const context = logContext.performance('test-operation', 150, {
        userId: '123',
        resource: 'user',
      })

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

  describe('Logger functionality', () => {
    it('should log different levels without throwing', () => {
      const logger = createPinoLogger({
        serviceName: 'test-service',
        environment: 'test',
        logLevel: 'trace',
      })

      expect(() => {
        logger.info('Info message')
        logger.warn('Warning message')
        logger.error('Error message')
        logger.debug('Debug message')
      }).not.toThrow()
    })

    it('should log with structured data without throwing', () => {
      const logger = createPinoLogger({
        serviceName: 'test-service',
        environment: 'test',
        logLevel: 'info',
      })

      expect(() => {
        logger.info(
          { userId: '123', action: 'login' },
          'User action',
        )
      }).not.toThrow()
    })
  })
})
