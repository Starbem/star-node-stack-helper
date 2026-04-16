import { LoggerService } from '@nestjs/common'
import type pino from 'pino'
import { LogWriter } from '../types'

/**
 * Creates a NestJS LoggerService backed by a Pino root logger.
 *
 * Every call to the NestJS logger API (log, error, warn, debug, verbose, fatal)
 * is forwarded to the Pino instance as a structured JSON record on stdout,
 * keeping the context name as a `context` field in the log object.
 *
 * Usage in main.ts:
 * ```typescript
 * // tracing.ts — must be imported FIRST (before pino)
 * import './tracing'
 *
 * import { NestFactory } from '@nestjs/core'
 * import { createPinoLogger, createNestPinoLoggerService } from '@starbemtech/star-node-stack-helper'
 * import { AppModule } from './app.module'
 *
 * async function bootstrap() {
 *   const rootLogger = createPinoLogger({
 *     serviceName: process.env.DD_SERVICE,
 *     correlationMode: 'datadog',
 *   })
 *
 *   const logger = createNestPinoLoggerService(rootLogger, 'Bootstrap')
 *
 *   const app = await NestFactory.create(AppModule, { logger })
 *   await app.listen(3000)
 * }
 * bootstrap()
 * ```
 */
export function createNestPinoLoggerService(
  rootLogger: pino.Logger,
  defaultContext?: string,
): LoggerService {
  return new NestPinoLoggerService(rootLogger, defaultContext)
}

/**
 * Creates a LogWriter (structured log interface used by lib interceptors/guards)
 * from a Pino logger instance bound to the given context name.
 */
export function createPinoLogWriter(
  rootLogger: pino.Logger,
  context?: string,
): LogWriter {
  const child = context ? rootLogger.child({ context }) : rootLogger
  return {
    info: (msg, ctx) => child.info(ctx ?? {}, msg),
    warn: (msg, ctx) => child.warn(ctx ?? {}, msg),
    error: (msg, ctx) => child.error(ctx ?? {}, msg),
    debug: (msg, ctx) => child.debug(ctx ?? {}, msg),
    trace: (msg, ctx) => child.trace(ctx ?? {}, msg),
    fatal: (msg, ctx) => child.fatal(ctx ?? {}, msg),
  }
}

// ---------------------------------------------------------------------------
// Internal implementation
// ---------------------------------------------------------------------------

class NestPinoLoggerService implements LoggerService {
  private readonly root: pino.Logger

  constructor(
    rootLogger: pino.Logger,
    private readonly defaultContext?: string,
  ) {
    this.root = rootLogger
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    const { ctx, extra } = this.parse(optionalParams)
    this.child(ctx).info(extra, this.stringify(message))
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    const { ctx, extra } = this.parse(optionalParams)
    const stack = this.extractStack(optionalParams)
    this.child(ctx).error(
      { ...extra, ...(stack ? { stack } : {}) },
      this.stringify(message),
    )
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    const { ctx, extra } = this.parse(optionalParams)
    this.child(ctx).warn(extra, this.stringify(message))
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    const { ctx, extra } = this.parse(optionalParams)
    this.child(ctx).debug(extra, this.stringify(message))
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    const { ctx, extra } = this.parse(optionalParams)
    this.child(ctx).trace(extra, this.stringify(message))
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    const { ctx, extra } = this.parse(optionalParams)
    this.child(ctx).fatal(extra, this.stringify(message))
  }

  private child(context?: string): pino.Logger {
    const ctx = context ?? this.defaultContext
    return ctx ? this.root.child({ context: ctx }) : this.root
  }

  private stringify(message: unknown): string {
    if (typeof message === 'string') return message
    try {
      return JSON.stringify(message)
    } catch {
      return String(message)
    }
  }

  /**
   * NestJS passes the context name as the last string param in most calls.
   * It also passes extra objects (e.g. error details) as earlier params.
   */
  private parse(params: unknown[]): {
    ctx: string | undefined
    extra: Record<string, unknown>
  } {
    let ctx: string | undefined
    const extra: Record<string, unknown> = {}

    for (const p of params) {
      if (typeof p === 'string' && !p.includes('\n')) {
        ctx = p
      } else if (p !== null && typeof p === 'object' && !Array.isArray(p)) {
        Object.assign(extra, p)
      }
    }

    return { ctx: ctx ?? this.defaultContext, extra }
  }

  private extractStack(params: unknown[]): string | undefined {
    for (const p of params) {
      if (typeof p === 'string' && p.includes('\n')) return p
    }
    return undefined
  }
}
