import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { LogExceptionFilterOptions, NestJSLogContext } from '../types'

@Catch()
export class LogExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LogExceptionFilter.name)

  constructor(private readonly options: LogExceptionFilterOptions = {}) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    // Determine status and message
    const status = this.getStatus(exception)
    const message = this.getMessage(exception)

    // Create base context
    const baseContext: NestJSLogContext = {
      method: request.method,
      className: 'ExceptionFilter',
      requestId: String(request.id || request.headers['x-request-id']),
      userId: (request as any).user?.id || (request as any).user?.userId,
      ...this.options.customContext?.(exception, host),
    }

    // Log exception
    this.logException(exception, request, baseContext, status, message)

    // Standardized response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message,
      ...(process.env['NODE_ENV'] === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    }

    response.status(status).json(errorResponse)
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus()
    }
    return HttpStatus.INTERNAL_SERVER_ERROR
  }

  private getMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse()
      if (typeof response === 'string') {
        return response
      }
      if (typeof response === 'object' && response !== null) {
        return (response as any).message || exception.message
      }
    }
    if (exception instanceof Error) {
      return exception.message
    }
    return 'Internal server error'
  }

  private logException(
    exception: unknown,
    request: Request,
    context: NestJSLogContext,
    status: number,
    message: string
  ): void {
    const logLevel = this.getLogLevel(status)
    const logMessage = `Exception: ${request.method} ${request.url}`

    this.logger[logLevel](logMessage, {
      ...context,
      exception: {
        name: exception instanceof Error ? exception.name : 'Unknown',
        message: message,
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
      response: {
        statusCode: status,
      },
    })
  }

  private getLogLevel(
    status: number
  ): 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' {
    if (status >= 500) return 'error'
    if (status >= 400) return 'warn'
    return 'info'
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
}
