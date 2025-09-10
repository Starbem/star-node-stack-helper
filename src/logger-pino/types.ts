export interface PinoLoggerConfig {
  serviceName: string
  environment?: 'development' | 'staging' | 'production' | 'test'
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
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
