import pino from 'pino'
import pinoHttp from 'pino-http'
import { PinoLoggerConfig } from './types'
import { getDatadogCorrelationFields, getOtelCorrelationFields } from './correlation'

// Sensitive paths always redacted in staging/production
const BASE_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.token',
  'req.body.secret',
  'res.headers["set-cookie"]',
]

// Routes silenced (status logged as 'silent') on healthy 2xx/3xx responses
const BASE_SILENT_ROUTES = [
  '/healthz',
  '/health',
  '/ready',
  '/live',
  '/ping',
  '/metrics',
  '/favicon.ico',
  '/robots.txt',
]

function resolveServiceName(config: PinoLoggerConfig): string {
  return (
    config.serviceName ||
    process.env['DD_SERVICE'] ||
    process.env['SERVICE_NAME'] ||
    'app'
  )
}

function resolveEnvironment(config: PinoLoggerConfig): string {
  return (
    config.environment ||
    process.env['DD_ENV'] ||
    process.env['NODE_ENV'] ||
    'development'
  )
}

function isDevEnvironment(env: string): boolean {
  return env === 'development' || env === 'local' || env === 'test'
}

function buildMixin(
  mode?: PinoLoggerConfig['correlationMode'],
): (() => Record<string, unknown>) | undefined {
  if (mode === 'datadog') return getDatadogCorrelationFields
  if (mode === 'otel') return getOtelCorrelationFields
  return undefined
}

/**
 * Creates a configured Pino logger aligned with the Datadog Agent log pipeline.
 *
 * Every log record will include:
 *   - `message`  — the log message (Datadog default mapping, avoids `msg` ambiguity)
 *   - `level`    — severity label string (info, warn, error, …)
 *   - `time`     — ISO 8601 timestamp
 *   - `service`  — from config.serviceName or DD_SERVICE env var
 *   - `env`      — from config.environment or DD_ENV / NODE_ENV env vars
 *   - `version`  — from DD_VERSION env var (omitted when not set)
 *   - `dd.*`     — trace_id / span_id when correlationMode is 'datadog'
 *   - `trace_id` / `span_id` — when correlationMode is 'otel'
 *
 * In development/local/test environments, uses pino-pretty if available.
 * In staging/production, redacts sensitive fields and outputs compact JSON.
 *
 * @example
 * ```typescript
 * // In main.ts — AFTER initializing dd-trace (see tracing.ts)
 * const logger = createPinoLogger({
 *   serviceName: 'my-api',
 *   correlationMode: 'datadog',
 * })
 * ```
 */
export const createPinoLogger = (
  config: PinoLoggerConfig,
  _destination?: pino.DestinationStream,
): pino.Logger => {
  const service = resolveServiceName(config)
  const env = resolveEnvironment(config)
  const version = process.env['DD_VERSION']
  const logLevel = config.logLevel ?? 'info'
  const isDev = isDevEnvironment(env)

  // Check pino-pretty availability for dev environments only
  let hasPinoPretty = false
  if (isDev) {
    try {
      require.resolve('pino-pretty')
      hasPinoPretty = true
    } catch {
      // pino-pretty not available — fall back to plain JSON
    }
  }

  // Base fields present in every log record
  // Explicitly set to avoid leaking pid/hostname from pino defaults
  const base: Record<string, unknown> = { service, env }
  if (version) base['version'] = version

  // Redact sensitive paths in non-dev environments
  const redactPaths = [
    ...BASE_REDACT_PATHS,
    ...(config.customRedactPaths ?? []),
  ]

  const levelFormatter =
    config.customFormatters?.level ??
    ((label: string) => ({ level: label }))

  const logFormatter =
    config.customFormatters?.log ??
    ((obj: unknown) => obj as Record<string, unknown>)

  const baseOptions: pino.LoggerOptions = {
    level: logLevel,
    messageKey: 'message',
    base,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: levelFormatter,
      log: logFormatter,
    } as NonNullable<pino.LoggerOptions['formatters']>,
    serializers: {
      req: (config.customSerializers?.req as pino.SerializerFn) ??
        pino.stdSerializers.req,
      res: (config.customSerializers?.res as pino.SerializerFn) ??
        pino.stdSerializers.res,
      err: (config.customSerializers?.err as pino.SerializerFn) ??
        pino.stdSerializers.err,
    },
  }

  const mixin = buildMixin(config.correlationMode)
  if (mixin) baseOptions.mixin = mixin

  if (isDev && hasPinoPretty) {
    return pino(
      {
        ...baseOptions,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            levelFirst: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            messageFormat: '{message}',
            messageKey: 'message',
          },
        },
      },
      _destination,
    )
  }

  if (!isDev) {
    return pino(
      { ...baseOptions, redact: { paths: redactPaths, remove: true } },
      _destination,
    )
  }

  return pino(baseOptions, _destination)
}

/**
 * Extracts the URL pathname, stripping query strings and handling apps that
 * mount routes under a global prefix (e.g. /connect/healthz).
 */
function extractPathname(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname
  } catch {
    return (url.split('?')[0] ?? url)
  }
}

/**
 * Returns true when the request URL matches one of the silent routes.
 * The match is done against the pathname, so:
 *   - /healthz?check=liveness → matches /healthz
 *   - /connect/healthz → matches /healthz (endsWith)
 */
function isSilentRoute(url: string, silentRoutes: string[]): boolean {
  const pathname = extractPathname(url)
  return silentRoutes.some(
    (route) => pathname === route || pathname.endsWith(route),
  )
}

/**
 * Creates a pino-http middleware for Express (or compatible frameworks).
 *
 * @param logger     Root pino logger (from createPinoLogger).
 * @param config     Optional subset of PinoLoggerConfig for HTTP-specific options.
 *
 * @example
 * ```typescript
 * const logger = createPinoLogger({ serviceName: 'my-api' })
 * app.use(createHttpLogger(logger, { customSilentRoutes: ['/internal/ready'] }))
 * ```
 */
export const createHttpLogger = (
  logger: pino.Logger,
  config?: Pick<PinoLoggerConfig, 'customSilentRoutes'>,
) => {
  const silentRoutes = [
    ...BASE_SILENT_ROUTES,
    ...(config?.customSilentRoutes ?? []),
  ]

  return pinoHttp({
    logger,
    customLogLevel: (req: any, res: any, err?: any) => {
      if (err) return 'error'

      if (isSilentRoute(req.url ?? '', silentRoutes)) {
        if (res.statusCode >= 400) return 'warn'
        return 'silent'
      }

      if (res.statusCode >= 500) return 'error'
      if (res.statusCode >= 400) return 'warn'
      return 'info'
    },
    customSuccessMessage: (req: any, res: any) =>
      `${req.method} ${req.url} - ${res.statusCode}`,
    customErrorMessage: (req: any, _res: any, err?: any) =>
      `${req.method} ${req.url} - ${err?.message ?? 'error'}`,
    customAttributeKeys: {
      req: 'request',
      res: 'response',
      err: 'error',
      responseTime: 'responseTime',
    },
  })
}

/** Helpers for building structured log context objects. */
export const logContext = {
  request: (req: any, additionalData?: any) => ({
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    xForwardedFor: req.get('X-Forwarded-For'),
    ...additionalData,
  }),

  error: (error: any, context?: any) => ({
    message: error.message,
    stack: error.stack,
    code: error.code,
    ...context,
  }),

  performance: (operation: string, duration: number, metadata?: any) => ({
    operation,
    duration,
    unit: 'ms',
    ...metadata,
  }),

  proxy: (target: string, service: string, metadata?: any) => ({
    target,
    service,
    type: 'proxy',
    ...metadata,
  }),
}
