export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type CorrelationMode = 'datadog' | 'otel' | 'none'
export type LogEnvironment =
  | 'development'
  | 'staging'
  | 'production'
  | 'local'
  | 'test'

export interface PinoLoggerConfig {
  /**
   * Service name included in every log record as `service`.
   * Defaults to DD_SERVICE → SERVICE_NAME env vars → 'app'.
   */
  serviceName?: string
  /**
   * Deployment environment.
   * Defaults to DD_ENV → NODE_ENV → 'development'.
   */
  environment?: LogEnvironment
  logLevel?: LogLevel
  /**
   * Strategy for injecting trace/span IDs into every log record.
   *
   * - `'datadog'`  Manual mixin using dd-trace's active span context.
   *               Requires `dd-trace` peer. Use when `DD_LOGS_INJECTION=true`
   *               automatic patching doesn't cover child loggers / workers.
   * - `'otel'`    Mixin using @opentelemetry/api active span context.
   *               Requires `@opentelemetry/api` peer.
   * - `'none'`    (default) No mixin. Rely on dd-trace automatic log injection
   *               (`DD_LOGS_INJECTION=true`) or have no trace correlation.
   */
  correlationMode?: CorrelationMode
  /**
   * Routes to silence in HTTP access logs (status 2xx/3xx) in addition to
   * the built-in list (/healthz, /health, /ready, /live, /ping, /metrics).
   * Matched by URL pathname — query strings and app prefixes are handled.
   */
  customSilentRoutes?: string[]
  customRedactPaths?: string[]
  customFormatters?: {
    level?: (label: string) => unknown
    log?: (object: unknown) => unknown
  }
  customSerializers?: {
    req?: (req: unknown) => unknown
    res?: (res: unknown) => unknown
    err?: (err: unknown) => unknown
  }
}
