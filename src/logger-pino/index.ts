import pino from 'pino'
import pinoHttp from 'pino-http'
import { PinoLoggerConfig } from './types'

const baseConfig = {
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label: string) => {
      return { level: label }
    },
    log: (object: Record<string, unknown>) => {
      return object
    },
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
}

const devConfig = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '{msg} {req.method} {req.url} {res.statusCode}',
    },
  },
}

const prodConfig = {
  ...baseConfig,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.secret',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
}

export const createPinoLogger = (config: PinoLoggerConfig) => {
  const loggerConfig =
    config.environment === 'production'
      ? { ...prodConfig, name: config.serviceName, level: config.logLevel }
      : { ...devConfig, name: config.serviceName, level: config.logLevel }
  return pino(loggerConfig as pino.LoggerOptions)
}

const silentRoutes = [
  '/healthz',
  '/health',
  '/ready',
  '/live',
  '/ping',
  '/metrics',
  '/favicon.ico',
  '/robots.txt',
]

export const createHttpLogger = (logger: pino.Logger) => {
  return pinoHttp({
    logger,
    customLogLevel: (req: any, res: any, err?: any) => {
      if (err) return 'error'

      if (silentRoutes.includes(req.url)) {
        if (res.statusCode >= 400) return 'warn'
        return 'silent'
      }

      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn'
      }
      if (res.statusCode >= 500) {
        return 'error'
      }
      return 'info'
    },
    customSuccessMessage: (req: any, res: any) => {
      return `${req.method} ${req.url} - ${res.statusCode}`
    },
    customErrorMessage: (req: any, res: any, err?: any) => {
      return `${req.method} ${req.url} - ${res.statusCode} - ${
        err?.message || 'Unknown error'
      }`
    },
    customAttributeKeys: {
      req: 'request',
      res: 'response',
      err: 'error',
      responseTime: 'responseTime',
    },
  })
}

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
