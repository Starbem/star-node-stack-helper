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
import { LOG_METADATA_KEY } from '../decorators/log.decorator'
import { LogInterceptorOptions, NestJSLogContext } from '../types'

@Injectable()
export class LogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LogInterceptor.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly options: LogInterceptorOptions = {}
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now()
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    // Get metadata from decorator
    const logMetadata = this.reflector.getAllAndOverride(LOG_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // Create base context
    const baseContext: NestJSLogContext = {
      method: context.getHandler().name,
      className: context.getClass().name,
      requestId: request.id || request.headers['x-request-id'],
      userId: request.user?.id || request.user?.userId,
      ...this.options.customContext?.(context),
    }

    // Log request (if not disabled)
    if (!this.options.skipRequestLogging && !logMetadata?.skipRequestLogging) {
      this.logRequest(request, baseContext, logMetadata)
    }

    return next.handle().pipe(
      tap((data) => {
        const executionTime = Date.now() - startTime
        baseContext.executionTime = executionTime

        // Log response (if not disabled)
        if (
          !this.options.skipResponseLogging &&
          !logMetadata?.skipResponseLogging
        ) {
          this.logResponse(request, response, data, baseContext, logMetadata)
        }
      }),
      catchError((error) => {
        const executionTime = Date.now() - startTime
        baseContext.executionTime = executionTime

        // Log error
        this.logError(request, error, baseContext, logMetadata)
        throw error
      })
    )
  }

  private logRequest(
    request: any,
    context: NestJSLogContext,
    metadata?: any
  ): void {
    const logLevel = metadata?.level || this.options.logLevel || 'info'
    const message =
      metadata?.message || `Request: ${request.method} ${request.url}`

    this.logger[logLevel](message, {
      ...context,
      ...metadata?.context,
      request: {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        body: this.sanitizeBody(request.body),
        query: request.query,
        params: request.params,
      },
    })
  }

  private logResponse(
    request: any,
    response: any,
    data: any,
    context: NestJSLogContext,
    metadata?: any
  ): void {
    const logLevel = metadata?.level || this.options.logLevel || 'info'
    const message =
      metadata?.message || `Response: ${request.method} ${request.url}`

    this.logger[logLevel](message, {
      ...context,
      ...metadata?.context,
      response: {
        statusCode: response.statusCode,
        data: this.sanitizeResponseData(data),
      },
    })
  }

  private logError(
    request: any,
    error: any,
    context: NestJSLogContext,
    metadata?: any
  ): void {
    const message =
      metadata?.message || `Error: ${request.method} ${request.url}`

    this.logger.error(message, {
      ...context,
      ...metadata?.context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        statusCode: error.status || 500,
      },
      request: {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        body: this.sanitizeBody(request.body),
      },
    })
  }

  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
    const sanitized = { ...headers }

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]'
      }
    })

    return sanitized
  }

  private sanitizeBody(body: any): any {
    if (!body) return body

    const sensitiveFields = ['password', 'token', 'secret', 'key']
    const sanitized = { ...body }

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    })

    return sanitized
  }

  private sanitizeResponseData(data: any): any {
    if (!data) return data

    // Limit response data size to avoid very large logs
    const dataStr = JSON.stringify(data)
    if (dataStr.length > 1000) {
      return {
        message: 'Response data too large for logging',
        size: dataStr.length,
      }
    }

    return data
  }
}
