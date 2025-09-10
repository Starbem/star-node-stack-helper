import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { ElasticLogger } from '../../logger'
import { LogTransaction } from '../../logger/types'
import {
  TRANSACTION_LOG_METADATA_KEY,
  TransactionLogMetadata,
} from '../decorators/transaction-log.decorator'

export interface AutoTransactionLogInterceptorOptions {
  elasticLogger: ElasticLogger | null
  defaultMicroservice?: string
  skipTransactionLogging?: boolean
}

@Injectable()
export class AutoTransactionLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AutoTransactionLogInterceptor.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly options: AutoTransactionLogInterceptorOptions
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.options.elasticLogger || this.options.skipTransactionLogging) {
      return next.handle()
    }

    // Get metadata from decorator
    const metadata = this.reflector.getAllAndOverride<TransactionLogMetadata>(
      TRANSACTION_LOG_METADATA_KEY,
      [context.getHandler(), context.getClass()]
    )

    // If no metadata, don't do transaction logging
    if (!metadata) {
      return next.handle()
    }

    const startTime = Date.now()
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    // Generate or get transaction ID
    const transactionId =
      request.headers['x-transaction-id'] ||
      request.headers['x-request-id'] ||
      `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Add transaction ID to request
    request.transactionId = transactionId

    // Set response headers
    response.setHeader('X-Transaction-ID', transactionId)

    // Use microservice from decorator or default
    const microservice =
      metadata.microservice ||
      this.options.defaultMicroservice ||
      'unknown-service'

    // Create request metadata
    const requestMeta = {
      method: request.method,
      path: request.url,
      ...(request.ip ? { ip: request.ip } : {}),
      ...(request.headers['user-agent']
        ? { userAgent: request.headers['user-agent'] }
        : {}),
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime
        const status = response.statusCode >= 400 ? 'fail' : 'success'

        // Create transaction context
        const transactionContext = this.buildTransactionContext(
          request,
          context,
          data,
          metadata
        )

        // Create transaction data
        const transactionData: LogTransaction = {
          name: metadata.operation,
          microservice,
          transactionId,
          operation: metadata.operation,
          status,
          duration,
          context: transactionContext,
          requestMeta,
          responseMeta: {
            statusCode: response.statusCode,
            responseSize: this.calculateResponseSize(data),
          },
        }

        // Log transaction asynchronously
        this.logTransactionAsync(transactionData)
      }),
      catchError((error) => {
        const duration = Date.now() - startTime
        const status = 'fail'

        // Create transaction context with error
        const transactionContext = this.buildTransactionContext(
          request,
          context,
          null,
          metadata,
          error
        )

        // Create transaction data with error
        const transactionData: LogTransaction = {
          name: metadata.operation,
          microservice,
          transactionId,
          operation: metadata.operation,
          status,
          duration,
          context: transactionContext,
          requestMeta,
          responseMeta: {
            statusCode: error.status || 500,
            responseSize: 0,
          },
          error: {
            message: error.message || 'Unknown error',
            code: error.code,
            stack: error.stack,
          },
        }

        // Log transaction with error asynchronously
        this.logTransactionAsync(transactionData)

        throw error
      })
    )
  }

  private buildTransactionContext(
    request: any,
    _executionContext: ExecutionContext,
    _responseData?: any,
    metadata?: TransactionLogMetadata,
    error?: any
  ): Record<string, unknown> {
    const context: Record<string, unknown> = {}

    // Add custom context from decorator
    if (metadata?.customContext) {
      Object.assign(context, metadata.customContext)
    }

    // Add URL parameters
    if (request.params) {
      Object.assign(context, request.params)
    }

    // Add query parameters (filtering sensitive data)
    if (request.query) {
      const filteredQuery = this.sanitizeObject(request.query, [
        'token',
        'password',
        'newPassword',
        'secret',
      ])
      Object.assign(context, filteredQuery)
    }

    // Add request body (filtering sensitive data)
    if (request.body && typeof request.body === 'object') {
      const filteredBody = this.sanitizeObject(request.body, [
        'password',
        'newPassword',
        'token',
        'secret',
      ])
      Object.assign(context, filteredBody)
    }

    // Add relevant headers
    const relevantHeaders = [
      'x-user-id',
      'x-appointment-id',
      'x-platform',
      'authorization',
      'content-type',
      'accept',
    ]

    relevantHeaders.forEach((header) => {
      const value = request.headers[header]
      if (value) {
        context[header] = header === 'authorization' ? '[REDACTED]' : value
      }
    })

    // Add user information if available
    if (request.user) {
      context['userId'] = request.user.id || request.user.userId
      context['userRole'] = request.user.role
    }

    // Add error information if present
    if (error) {
      context['errorType'] = error.constructor.name
      context['errorMessage'] = error.message
    }

    return context
  }

  private sanitizeObject(obj: any, sensitiveFields: string[]): any {
    const sanitized = { ...obj }
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    })
    return sanitized
  }

  private calculateResponseSize(data: any): number {
    if (!data) return 0
    try {
      return JSON.stringify(data).length
    } catch {
      return 0
    }
  }

  private logTransactionAsync(transactionData: LogTransaction): void {
    setImmediate(async () => {
      try {
        await this.options.elasticLogger!.logTransaction(transactionData)
      } catch (error) {
        this.logger.error('❌ Error registering transaction log:', {
          transactionId: transactionData.transactionId,
          microservice: transactionData.microservice,
          operation: transactionData.operation,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }
}
