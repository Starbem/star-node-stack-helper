import { ExecutionContext, ArgumentsHost } from '@nestjs/common'

export interface NestJSLogContext {
  method: string
  className: string
  executionTime?: number
  userId?: string
  requestId?: string
  [key: string]: unknown
}

/**
 * Generic structured log writer interface.
 * Implemented by both createPinoLogWriter (Pino-backed) and the
 * default NestJS Logger wrapper used for backward compatibility.
 */
export interface LogWriter {
  info: (message: string, context?: Record<string, unknown>) => void
  warn: (message: string, context?: Record<string, unknown>) => void
  error: (message: string, context?: Record<string, unknown>) => void
  debug: (message: string, context?: Record<string, unknown>) => void
  trace: (message: string, context?: Record<string, unknown>) => void
  fatal: (message: string, context?: Record<string, unknown>) => void
}

/** @deprecated Use LogWriter instead. Kept for backward compatibility. */
export type PinoLogger = LogWriter

export interface LogInterceptorOptions {
  skipRequestLogging?: boolean
  skipResponseLogging?: boolean
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  customContext?: (context: ExecutionContext) => Record<string, unknown>
  /** Structured log writer. When omitted, falls back to Nest built-in Logger. */
  logWriter?: LogWriter
}

export interface LogGuardOptions {
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  customContext?: (context: ExecutionContext) => Record<string, unknown>
  /** Structured log writer. When omitted, falls back to Nest built-in Logger. */
  logWriter?: LogWriter
}

export interface LogExceptionFilterOptions {
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  customContext?: (
    exception: unknown,
    host: ArgumentsHost,
  ) => Record<string, unknown>
  /** Structured log writer. When omitted, falls back to Nest built-in Logger. */
  logWriter?: LogWriter
}
