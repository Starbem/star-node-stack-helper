import { createPinoLogger, logContext } from '../logger-pino'

export const performanceLoggerMiddleware = (
  microservice: string,
  operation: string,
  environment: 'development' | 'staging' | 'production' | 'test'
) => {
  const logger = createPinoLogger({
    serviceName: microservice,
    environment: environment || 'development',
    logLevel: 'info',
  })

  return (req: any, res: any, next: any) => {
    const startTime = Date.now()

    const originalSend = res.send
    res.send = function (data: any) {
      const duration = Date.now() - startTime

      logger.info(`⏱️ ${operation} concluída`, {
        ...logContext.request(req),
        ...logContext.performance(operation, duration),
        statusCode: res.statusCode,
        responseSize: data?.length || 0,
      })

      return originalSend.call(this, data)
    }

    next()
  }
}
