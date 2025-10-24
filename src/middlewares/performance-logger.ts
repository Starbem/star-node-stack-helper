import { createPinoLogger, logContext } from '../logger-pino'
import { Request, Response, NextFunction } from 'express'

export const performanceLoggerMiddleware = (
  microservice: string,
  operation: string,
  environment: 'development' | 'staging' | 'production' | 'local' | 'test'
) => {
  const logger = createPinoLogger({
    serviceName: microservice,
    environment: environment || 'development',
    logLevel: 'info',
  })

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now()

    const originalSend = res.send
    res.send = function (data: unknown) {
      const duration = Date.now() - startTime

      logger.info(`⏱️ ${operation} concluída`, {
        ...logContext.request(req),
        ...logContext.performance(operation, duration),
        statusCode: res.statusCode,
        responseSize: (data as string)?.length || 0,
      } as any)

      return originalSend.call(this, data)
    }

    next()
  }
}
