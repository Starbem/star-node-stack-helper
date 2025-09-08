import { Request, Response, NextFunction } from '../types/express'
import { getSystemLogger } from '../core/system-logger'
import { TransactionData } from '../types/transaction'
import { filterSensitiveFields } from '../utils/request-parser'

/**
 * @name Request
 * @description Extends the Request interface to include transactionId
 */
declare global {
  namespace Express {
    interface Request {
      transactionId?: string
    }
  }
}

/**
 * @name transactionLogger
 * @description Middleware to capture transaction logs automatically
 * @param operation
 * @param config
 * @returns
 */
export const transactionLogger = (
  operation: string,
  config?: {
    sensitiveFields?: string[]
    customExtractors?: Record<string, (req: Request, res: Response) => any>
    customFields?: Record<string, any>
  }
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now()
    const transactionId =
      (req.headers['x-transaction-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    req.transactionId = transactionId

    const requestMeta = {
      method: req.method,
      path: req.originalUrl,
      ...(req.ip && { ip: req.ip }),
      ...(req.connection?.remoteAddress && {
        ip: req.connection.remoteAddress,
      }),
      ...(req.get('User-Agent') && { userAgent: req.get('User-Agent') }),
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
        const sensitiveFields = config?.sensitiveFields || [
          'token',
          'password',
          'secret',
        ]
        const filteredQuery = filterSensitiveFields(req.query, sensitiveFields)
        Object.assign(context, filteredQuery)
      }

      if (req.body && typeof req.body === 'object') {
        const sensitiveFields = config?.sensitiveFields || [
          'password',
          'token',
          'secret',
          'creditCard',
        ]
        const filteredBody = filterSensitiveFields(req.body, sensitiveFields)
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

      const transactionData: TransactionData = {
        name: operation,
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

      if (config?.customExtractors) {
        Object.entries(config.customExtractors).forEach(([key, extractor]) => {
          try {
            const value = extractor(req, res)
            if (value !== undefined) {
              transactionData[key] = value
            }
          } catch (error) {
            console.warn(`Failed to extract custom field ${key}:`, error)
          }
        })
      }

      if (config?.customFields) {
        Object.assign(transactionData, config.customFields)
      }

      setImmediate(async () => {
        try {
          const systemLogger = getSystemLogger()
          await systemLogger.businessEvent(
            'transaction_completed',
            {
              ...transactionData,
              operation,
              status,
              duration,
              statusCode: res.statusCode,
            },
            transactionId
          )
        } catch (error) {
          console.error('❌ Error logging transaction:', {
            transactionId,
            operation,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      })

      return originalSend.call(this, data)
    }

    const originalNext = next
    next = function (this: any, error?: any) {
      if (error) {
        const duration = Date.now() - startTime

        const transactionData: TransactionData = {
          name: operation,
          transactionId,
          operation,
          status: 'fail',
          duration,
          context: {
            ...req.params,
            ...req.query,
          },
          requestMeta: {
            method: req.method,
            path: req.originalUrl,
            ...(req.ip && { ip: req.ip }),
            ...(req.connection?.remoteAddress && {
              ip: req.connection.remoteAddress,
            }),
            ...(req.get('User-Agent') && { userAgent: req.get('User-Agent') }),
          },
          responseMeta: {
            statusCode: res.statusCode || 500,
          },
          error: {
            message: error.message || 'Unknown error',
            code: error.code,
            stack: error.stack,
          },
        }

        setImmediate(async () => {
          try {
            const systemLogger = getSystemLogger()
            await systemLogger.error(
              `Transaction error: ${operation}`,
              error,
              {
                ...transactionData,
                operation,
                duration,
              },
              transactionId
            )
          } catch (logError) {
            console.error('❌ Error logging transaction error:', {
              transactionId,
              operation,
              error:
                logError instanceof Error ? logError.message : 'Unknown error',
            })
          }
        })
      }

      return originalNext.call(this, error)
    }

    next()
  }
}

/**
 * @name addTransactionId
 * @description Middleware to add transaction ID to all requests
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const addTransactionId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.transactionId) {
    req.transactionId =
      (req.headers['x-transaction-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  res.setHeader('X-Transaction-ID', req.transactionId)

  next()
}
