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
import { LogInterceptorOptions, LogWriter, NestJSLogContext } from '../types'

function createNestLogWriter(contextName: string): LogWriter {
  const logger = new Logger(contextName)
  return {
    info: (msg) => logger.log(msg, contextName),
    warn: (msg) => logger.warn(msg, contextName),
    error: (msg) => logger.error(msg, contextName),
    debug: (msg) => logger.debug(msg, contextName),
    trace: (msg) => logger.verbose(msg, contextName),
    fatal: (msg) => logger.error(`[FATAL] ${msg}`, contextName),
  }
}

@Injectable()
export class LogInterceptor implements NestInterceptor {
  private readonly writer: LogWriter

  constructor(
    private readonly reflector: Reflector,
    private readonly options: LogInterceptorOptions = {},
  ) {
    this.writer =
      options.logWriter ?? createNestLogWriter(LogInterceptor.name)
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now()
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    const logMetadata = this.reflector.getAllAndOverride(LOG_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    const baseContext: NestJSLogContext = {
      method: context.getHandler().name,
      className: context.getClass().name,
      requestId: request.id || request.headers['x-request-id'],
      userId: request.user?.id || request.user?.userId,
      ...this.options.customContext?.(context),
    }

    if (!this.options.skipRequestLogging && !logMetadata?.skipRequestLogging) {
      this.logRequest(request, baseContext, logMetadata)
    }

    return next.handle().pipe(
      tap((data) => {
        const executionTime = Date.now() - startTime
        baseContext.executionTime = executionTime

        if (
          !this.options.skipResponseLogging &&
          !logMetadata?.skipResponseLogging
        ) {
          this.logResponse(request, response, data, baseContext, logMetadata)
        }
      }),
      catchError((error) => {
        baseContext.executionTime = Date.now() - startTime
        this.logError(request, error, baseContext, logMetadata)
        throw error
      }),
    )
  }

  private logRequest(
    request: any,
    context: NestJSLogContext,
    metadata?: any,
  ): void {
    const level = (metadata?.level || this.options.logLevel || 'info') as keyof LogWriter
    const message =
      metadata?.message || `Request: ${request.method} ${request.url}`

    this.writer[level](message, {
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
    metadata?: any,
  ): void {
    const level = (metadata?.level || this.options.logLevel || 'info') as keyof LogWriter
    const message =
      metadata?.message || `Response: ${request.method} ${request.url}`

    this.writer[level](message, {
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
    metadata?: any,
  ): void {
    const message =
      metadata?.message || `Error: ${request.method} ${request.url}`

    this.writer.error(message, {
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
    sensitiveHeaders.forEach((h) => {
      if (sanitized[h]) sanitized[h] = '[REDACTED]'
    })
    return sanitized
  }

  private sanitizeBody(body: any): any {
    if (!body) return body
    const sensitiveFields = ['password', 'token', 'secret', 'key']
    const sanitized = { ...body }
    sensitiveFields.forEach((f) => {
      if (sanitized[f]) sanitized[f] = '[REDACTED]'
    })
    return sanitized
  }

  private sanitizeResponseData(data: any): any {
    if (!data) return data
    const dataStr = JSON.stringify(data)
    if (dataStr.length > 1000) {
      return { message: 'Response data too large for logging', size: dataStr.length }
    }
    return data
  }
}
