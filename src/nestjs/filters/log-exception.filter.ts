import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { LogExceptionFilterOptions, LogWriter, NestJSLogContext } from '../types'

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

@Catch()
export class LogExceptionFilter implements ExceptionFilter {
  private readonly writer: LogWriter

  constructor(private readonly options: LogExceptionFilterOptions = {}) {
    this.writer =
      options.logWriter ?? createNestLogWriter(LogExceptionFilter.name)
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status = this.getStatus(exception)
    const message = this.getMessage(exception)

    const baseContext: NestJSLogContext = {
      method: request.method,
      className: 'ExceptionFilter',
      requestId: String(request.id || request.headers['x-request-id'] || ''),
      userId: (request as any).user?.id || (request as any).user?.userId,
      ...this.options.customContext?.(exception, host),
    }

    this.logException(exception, request, baseContext, status, message)

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(process.env['NODE_ENV'] === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    }

    response.status(status).json(errorResponse)
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus()
    return HttpStatus.INTERNAL_SERVER_ERROR
  }

  private getMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const res = exception.getResponse()
      if (typeof res === 'string') return res
      if (typeof res === 'object' && res !== null) {
        return (res as any).message || exception.message
      }
    }
    if (exception instanceof Error) return exception.message
    return 'Internal server error'
  }

  private logException(
    exception: unknown,
    request: Request,
    context: NestJSLogContext,
    status: number,
    message: string,
  ): void {
    const level = this.getLogLevel(status) as keyof LogWriter
    const logMessage = `Exception: ${request.method} ${request.url}`

    this.writer[level](logMessage, {
      ...context,
      exception: {
        name: exception instanceof Error ? exception.name : 'Unknown',
        message,
        stack: exception instanceof Error ? exception.stack : undefined,
        statusCode: status,
      },
      request: {
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        headers: this.sanitizeHeaders(request.headers),
        body: this.sanitizeBody((request as any).body),
        query: request.query,
        params: (request as any).params,
      },
      response: { statusCode: status },
    })
  }

  private getLogLevel(
    status: number,
  ): 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' {
    if (status >= 500) return 'error'
    if (status >= 400) return 'warn'
    return 'info'
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
}
