export interface PinoLoggerConfig {
  serviceName: string
  environment?: 'development' | 'staging' | 'production' | 'test'
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  customSilentRoutes?: string[]
  customRedactPaths?: string[]
  customFormatters?: {
    level?: (label: string) => any
    log?: (object: any) => any
  }
  customSerializers?: {
    req?: (req: any) => any
    res?: (res: any) => any
    err?: (err: any) => any
  }
}
