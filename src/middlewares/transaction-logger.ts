import { ElasticLogger } from '../logger'
import { LogTransaction } from '../logger/types'

export const transactionLoggerMiddleware = (
  microservice: string,
  operation: string,
  elasticLogger: ElasticLogger | null
) => {
  return (req: any, res: any, next: any) => {
    if (!elasticLogger) {
      return next()
    }

    const startTime = Date.now()
    const transactionId =
      (req.headers['x-transaction-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    req.transactionId = transactionId

    const requestMeta = {
      method: req.method,
      path: req.originalUrl,
      ...(req.ip || req.socket.remoteAddress
        ? { ip: req.ip || req.socket.remoteAddress }
        : {}),
      ...(req.get('User-Agent') ? { userAgent: req.get('User-Agent') } : {}),
    }

    const originalSend = res.send
    res.send = function (data: any) {
      const duration = Date.now() - startTime
      const status = res.statusCode >= 400 ? 'fail' : 'success'

      const context: Record<string, any> = {}

      if (req.params) {
        Object.assign(context, req.params)
      }

      if (req.query) {
        const filteredQuery = { ...req.query }
        delete filteredQuery['token']
        delete filteredQuery['password']
        delete filteredQuery['newPassword']
        delete filteredQuery['secret']
        Object.assign(context, filteredQuery)
      }

      if (req.body && typeof req.body === 'object') {
        const filteredBody = { ...req.body }
        delete filteredBody['password']
        delete filteredBody['newPassword']
        delete filteredBody['token']
        delete filteredBody['secret']
        Object.assign(context, filteredBody)
      }

      const relevantHeaders = [
        'x-user-id',
        'x-appointment-id',
        'x-platform',
        'authorization',
        'content-type',
        'accept',
      ]

      relevantHeaders.forEach((header) => {
        const value = req.get(header)
        if (value) {
          context[header] = header === 'authorization' ? '[REDACTED]' : value
        }
      })

      const transactionData: LogTransaction = {
        name: operation,
        microservice,
        transactionId,
        operation,
        status,
        duration,
        context,
        requestMeta,
        responseMeta: {
          statusCode: res.statusCode,
          responseSize: data?.length || 0,
        },
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

      return originalSend.call(this, data)
    }

    next()
  }
}

export const addTransactionId = (req: any, res: any, next: any) => {
  if (!req.transactionId) {
    req.transactionId =
      (req.headers['x-transaction-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  res.setHeader('X-Transaction-ID', req.transactionId)

  next()
}

declare global {
  namespace Express {
    interface Request {
      transactionId?: string
    }
  }
}
