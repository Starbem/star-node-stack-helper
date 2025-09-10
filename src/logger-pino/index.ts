import pino from 'pino'
import pinoHttp from 'pino-http'
import { PinoLoggerConfig } from './types'

export const createPinoLogger = (config: PinoLoggerConfig) => {
  const baseConfig = {
    name: config.serviceName,
    level: config.logLevel || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level:
        config.customFormatters?.level ||
        ((label: string) => ({ level: label })),
      log: config.customFormatters?.log || ((object: any) => object),
    },
    serializers: {
      req: config.customSerializers?.req || pino.stdSerializers.req,
      res: config.customSerializers?.res || pino.stdSerializers.res,
      err: config.customSerializers?.err || pino.stdSerializers.err,
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
        'res.headers["set-cookie"]',
        ...(config.customRedactPaths || []),
      ],
      remove: true,
    },
  }

  const loggerConfig =
    config.environment === 'production' ? prodConfig : devConfig
  return pino(loggerConfig)
}

export const createHttpLogger = (
  logger: pino.Logger,
  options?: {
    silentRoutes?: string[]
    customLogLevel?: (req: Request, res: Response, err?: any) => string
    customSuccessMessage?: (req: Request, res: Response) => string
    customErrorMessage?: (req: Request, res: Response, err?: any) => string
  }
) => {
  const defaultSilentRoutes = [
    '/healthz',
    '/health',
    '/ready',
    '/live',
    '/metrics',
    '/favicon.ico',
  ]

  return pinoHttp({
    logger: logger as any,
    customLogLevel:
      options?.customLogLevel ||
      ((req: any, res: any, err?: any) => {
        if (err) return 'error'

        const silentRoutes = [
          ...defaultSilentRoutes,
          ...(options?.silentRoutes || []),
        ]
        if (silentRoutes.includes(req.url)) {
          if (res.statusCode >= 400) return 'warn'
          return 'silent'
        }

        if (res.statusCode >= 400 && res.statusCode < 500) return 'warn'
        if (res.statusCode >= 500) return 'error'
        return 'info'
      }),
    customSuccessMessage:
      options?.customSuccessMessage ||
      ((req: any, res: any) => `${req.method} ${req.url} - ${res.statusCode}`),
    customErrorMessage:
      options?.customErrorMessage ||
      ((req: any, res: any, err?: any) =>
        `${req.method} ${req.url} - ${res.statusCode} - ${err?.message || 'Unknown error'}`),
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
}
