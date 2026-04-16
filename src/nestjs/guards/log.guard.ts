import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { LogGuardOptions, LogWriter, NestJSLogContext } from '../types'

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
export class LogGuard implements CanActivate {
  private readonly writer: LogWriter

  constructor(private readonly options: LogGuardOptions = {}) {
    this.writer = options.logWriter ?? createNestLogWriter(LogGuard.name)
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()

    const baseContext: NestJSLogContext = {
      method: context.getHandler().name,
      className: context.getClass().name,
      requestId: request.id || request.headers['x-request-id'],
      userId: request.user?.id || request.user?.userId,
      ...this.options.customContext?.(context),
    }

    try {
      this.logAccessAttempt(request, baseContext)

      const isAuthenticated = this.checkAuthentication(request)
      if (!isAuthenticated) {
        this.logAuthenticationFailure(request, baseContext)
        throw new UnauthorizedException('Authentication required')
      }

      const isAuthorized = this.checkAuthorization(request)
      if (!isAuthorized) {
        this.logAuthorizationFailure(request, baseContext)
        throw new ForbiddenException('Insufficient permissions')
      }

      this.logAccessSuccess(request, baseContext)
      return true
    } catch (error) {
      this.logAccessError(request, error, baseContext)
      throw error
    }
  }

  private checkAuthentication(request: any): boolean {
    const token = request.headers.authorization?.replace('Bearer ', '')
    return !!token
  }

  private checkAuthorization(_request: any): boolean {
    return true
  }

  private logAccessAttempt(request: any, context: NestJSLogContext): void {
    const level = (this.options.logLevel || 'info') as keyof LogWriter
    this.writer[level]('Access attempt', {
      ...context,
      request: {
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        headers: this.sanitizeHeaders(request.headers),
      },
    })
  }

  private logAuthenticationFailure(
    request: any,
    context: NestJSLogContext,
  ): void {
    this.writer.warn('Authentication failed', {
      ...context,
      request: {
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    })
  }

  private logAuthorizationFailure(
    request: any,
    context: NestJSLogContext,
  ): void {
    this.writer.warn('Authorization failed', {
      ...context,
      request: {
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
      user: { id: request.user?.id, roles: request.user?.roles },
    })
  }

  private logAccessSuccess(request: any, context: NestJSLogContext): void {
    const level = (this.options.logLevel || 'info') as keyof LogWriter
    this.writer[level]('Access granted', {
      ...context,
      request: { method: request.method, url: request.url, ip: request.ip },
      user: { id: request.user?.id, roles: request.user?.roles },
    })
  }

  private logAccessError(
    request: any,
    error: any,
    context: NestJSLogContext,
  ): void {
    this.writer.error('Access error', {
      ...context,
      request: { method: request.method, url: request.url, ip: request.ip },
      error: { name: error.name, message: error.message, stack: error.stack },
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
}
