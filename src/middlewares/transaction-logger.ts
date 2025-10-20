import { ElasticLogger } from '../logger'
import { LogTransaction } from '../logger/types'
import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

declare global {
  namespace Express {
    interface Request {
      transactionId?: string
    }
  }
}

export const transactionLoggerMiddleware = (
  microservice: string,
  operation: string,
  elasticLogger: ElasticLogger | null
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!elasticLogger) {
      return next()
    }

    const startTime = Date.now()
    const transactionId =
      (req.headers['x-transaction-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    req.transactionId = transactionId

    const SENSITIVE_KEYS = new Set<string>([
      'password',
      'newPassword',
      'token',
      'secret',
      'authorization',
      'cpf',
      'ssn',
      'creditCard',
      'cvv',
      'pin',
    ])

    const sanitize = (value: unknown, depth = 0): unknown => {
      if (depth > 6) return '[DEPTH_LIMIT]'
      if (value === null || typeof value !== 'object') return value
      if (Array.isArray(value)) {
        return value.slice(0, 100).map((v) => sanitize(v, depth + 1))
      }
      const obj = value as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.has(k)) {
          out[k] = '[REDACTED]'
        } else {
          out[k] = sanitize(v, depth + 1)
        }
      }
      return out
    }

    const toLimitedJson = (obj: unknown, maxBytes = 64 * 1024): string => {
      try {
        const s = JSON.stringify(obj)
        if (Buffer.byteLength(s, 'utf8') <= maxBytes) return s
        const preview = s.slice(0, maxBytes)
        const hash = crypto.createHash('sha256').update(s).digest('hex')
        return `${preview}...[TRUNCATED:${hash}]`
      } catch {
        return '[UNSERIALIZABLE]'
      }
    }

    const requestMeta = {
      method: req.method,
      path: req.originalUrl,
      baseUrl: req.baseUrl,
      route: (req as any).route?.path,
      host: req.get('host'),
      referrer: req.get('referer') || req.get('referrer'),
      ip: req.ip || req.socket.remoteAddress,
      xForwardedFor: req.get('x-forwarded-for'),
      userAgent: req.get('User-Agent'),
      httpVersion: req.httpVersion,
    }

    const relevantHeaders = [
      'x-user-id',
      'x-appointment-id',
      'x-platform',
      'x-tenant-id',
      'x-locale',
      'x-correlation-id',
      'x-trace-id',
      'x-parent-span-id',
      'x-span-id',
      'authorization',
      'content-type',
      'accept',
    ]

    const headerContext: Record<string, unknown> = {}
    for (const h of relevantHeaders) {
      const v = req.get(h)
      if (v) headerContext[h] = h === 'authorization' ? '[REDACTED]' : v
    }

    const paramsSan = sanitize(req.params || {})
    const querySan = sanitize(req.query || {})
    const bodySan = typeof req.body === 'object' ? sanitize(req.body) : req.body

    const requestPayload = {
      params: paramsSan,
      query: querySan,
      body: bodySan,
      paramsStr: toLimitedJson(paramsSan),
      queryStr: toLimitedJson(querySan),
      bodyStr: toLimitedJson(bodySan),
      contentLength: req.get('content-length'),
    }

    res.once('finish', () => {
      const duration = Date.now() - startTime
      const status = res.statusCode >= 400 ? 'fail' : 'success'

      const resContentLengthHeader = res.getHeader('content-length')
      const responseSizeValue =
        typeof resContentLengthHeader === 'string'
          ? parseInt(resContentLengthHeader, 10)
          : typeof resContentLengthHeader === 'number'
            ? resContentLengthHeader
            : undefined
      const responseMeta: {
        statusCode: number
        data?: unknown
        responseSize?: number
      } = {
        statusCode: res.statusCode,
        ...(typeof responseSizeValue === 'number'
          ? { responseSize: responseSizeValue }
          : {}),
      }

      const context: Record<string, unknown> = {
        ...headerContext,
        ...requestPayload,
        trace: {
          requestId: req.headers['x-request-id'],
          transactionId,
          traceId: req.headers['x-trace-id'],
          parentSpanId: req.headers['x-parent-span-id'],
          spanId: req.headers['x-span-id'],
        },
        env: {
          nodeEnv: process.env['NODE_ENV'],
          serviceVersion: process.env['npm_package_version'],
          podName: process.env['HOSTNAME'],
          region: process.env['AWS_REGION'] || process.env['GCP_REGION'],
        },
      }

      const transactionData: LogTransaction = {
        name: operation,
        microservice,
        transactionId,
        operation,
        status,
        duration,
        context,
        requestMeta,
        responseMeta,
      }

      setImmediate(async () => {
        try {
          await elasticLogger.logTransaction(transactionData)
        } catch (error) {
          console.error('❌ Erro ao registrar log transacional:', {
            transactionId,
            microservice,
            operation,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      })
    })

    next()
  }
}

export const addTransactionId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.transactionId) {
    req.transactionId =
      (req.headers['x-transaction-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  res.setHeader('X-Transaction-ID', req.transactionId)

  next()
}
