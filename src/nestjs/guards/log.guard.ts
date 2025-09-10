import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { LogGuardOptions, NestJSLogContext } from '../types'

@Injectable()
export class LogGuard implements CanActivate {
  private readonly logger = new Logger(LogGuard.name)

  constructor(private readonly options: LogGuardOptions = {}) {}

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

      // TODO: Here you can add authentication/authorization logic
      // For example, check JWT, roles, etc.
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
    // TODO: Implement authentication logic
    // For example, check JWT token
    const token = request.headers.authorization?.replace('Bearer ', '')
    return !!token // Simplified for example
  }

  private checkAuthorization(_request: any): boolean {
    // TODO: Implement authorization logic
    // For example, check roles, permissions, etc.
    return true // Simplified for example
  }

  private logAccessAttempt(request: any, context: NestJSLogContext): void {
    const logLevel = this.options.logLevel || 'info'

    this.logger[logLevel]('Access attempt', {
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
    context: NestJSLogContext
  ): void {
    this.logger.warn('Authentication failed', {
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
    context: NestJSLogContext
  ): void {
    this.logger.warn('Authorization failed', {
      ...context,
      request: {
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
      user: {
        id: request.user?.id,
        roles: request.user?.roles,
      },
    })
  }

  private logAccessSuccess(request: any, context: NestJSLogContext): void {
    const logLevel = this.options.logLevel || 'info'

    this.logger[logLevel]('Access granted', {
      ...context,
      request: {
        method: request.method,
        url: request.url,
        ip: request.ip,
      },
      user: {
        id: request.user?.id,
        roles: request.user?.roles,
      },
    })
  }

  private logAccessError(
    request: any,
    error: any,
    context: NestJSLogContext
  ): void {
    this.logger.error('Access error', {
      ...context,
      request: {
        method: request.method,
        url: request.url,
        ip: request.ip,
      },
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
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
}
