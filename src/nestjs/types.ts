import { ExecutionContext, ArgumentsHost } from '@nestjs/common'

export interface NestJSLogContext {
  method: string
  className: string
  executionTime?: number
  userId?: string
  requestId?: string
  [key: string]: unknown
}

export interface PinoLogger {
  info: (message: string, context?: Record<string, unknown>) => void
  warn: (message: string, context?: Record<string, unknown>) => void
  error: (message: string, context?: Record<string, unknown>) => void
  debug: (message: string, context?: Record<string, unknown>) => void
  trace: (message: string, context?: Record<string, unknown>) => void
  fatal: (message: string, context?: Record<string, unknown>) => void
}

export interface LogInterceptorOptions {
  skipRequestLogging?: boolean
  skipResponseLogging?: boolean
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  customContext?: (context: ExecutionContext) => Record<string, unknown>
}

export interface LogGuardOptions {
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  customContext?: (context: ExecutionContext) => Record<string, unknown>
}

export interface LogExceptionFilterOptions {
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  customContext?: (
    exception: unknown,
    host: ArgumentsHost
  ) => Record<string, unknown>
}
