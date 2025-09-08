import { Request, Response, NextFunction } from '../types/express'
import { getSystemLogger } from '../core/system-logger'
import { LoggingOptions } from '../types/system'
import {
  extractRequestData,
  extractResponseData,
  extractBusinessData,
} from '../utils/request-parser'

// Type for controller methods
type ControllerMethod = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<void> | void

/**
 * @name LoggedMethod
 * @description Decorator for controller methods
 * @param options
 * @returns
 */
export function LoggedMethod(options: LoggingOptions = {}) {
  return function (
    _target: any,
    propertyName: string,
    descriptor?: TypedPropertyDescriptor<ControllerMethod>
  ): TypedPropertyDescriptor<ControllerMethod> | void {
    if (!descriptor || !descriptor.value) {
      console.warn(`Decorator applied to invalid target: ${propertyName}`)
      return
    }

    const method = descriptor.value

    descriptor.value = async function (
      this: any,
      req: Request,
      res: Response,
      next?: NextFunction
    ) {
      const startTime = Date.now()
      const operation = options.operation || propertyName
      const transactionId = req.transactionId

      try {
        // Log request if enabled
        if (options.logRequest) {
          const requestData = extractRequestData(req, options.sensitiveFields)
          await getSystemLogger().info(
            `📥 ${operation} - Request received`,
            {
              ...requestData,
              operation,
            },
            transactionId
          )
        }

        const result = await method.call(this, req, res, next)

        const duration = Date.now() - startTime

        if (options.logPerformance) {
          await getSystemLogger().performance(
            operation,
            duration,
            {
              statusCode: res.statusCode,
            },
            transactionId
          )
        }

        if (options.logBusinessEvent && options.businessEventName) {
          const businessData = extractBusinessData(
            req,
            res,
            options.sensitiveFields
          )
          await getSystemLogger().businessEvent(
            options.businessEventName,
            {
              ...businessData,
              duration,
              statusCode: res.statusCode,
            },
            transactionId
          )
        }

        if (options.logResponse) {
          const responseData = extractResponseData(res)
          await getSystemLogger().info(
            `📤 ${operation} - Response sent`,
            {
              ...responseData,
              operation,
              duration,
            },
            transactionId
          )
        }

        return result
      } catch (error) {
        const duration = Date.now() - startTime

        await getSystemLogger().error(
          `❌ ${operation} - Error occurred`,
          error as Error,
          {
            operation,
            duration,
            statusCode: res.statusCode || 500,
          },
          transactionId
        )

        throw error
      }
    } as ControllerMethod

    return descriptor
  }
}

/**
 * @name LoggedApiOperation
 * @description Decorator for generic API operations
 * @param operationName
 * @param options
 * @returns
 */
export function LoggedApiOperation(
  operationName: string,
  options?: {
    logRequest?: boolean
    logResponse?: boolean
    logPerformance?: boolean
    logBusinessEvent?: boolean
    businessEventName?: string
    sensitiveFields?: string[]
  }
) {
  return LoggedMethod({
    operation: operationName,
    logRequest: options?.logRequest ?? true,
    logPerformance: options?.logPerformance ?? true,
    logBusinessEvent: options?.logBusinessEvent ?? true,
    businessEventName: options?.businessEventName || `api_${operationName}`,
    sensitiveFields: options?.sensitiveFields || [
      'token',
      'password',
      'secret',
    ],
  })
}

/**
 * @name LoggedSecurityOperation
 * @description Decorator for security operations
 * @param operationName
 * @returns
 */
export function LoggedSecurityOperation(operationName: string) {
  return LoggedMethod({
    operation: operationName,
    logRequest: true,
    logPerformance: true,
    logBusinessEvent: false,
    sensitiveFields: ['token', 'password', 'secret', 'authorization'],
  })
}

/**
 * @name LoggedBusinessOperation
 * @description Decorator for business operations
 * @param operationName
 * @param businessEventName
 * @returns
 */
export function LoggedBusinessOperation(
  operationName: string,
  businessEventName?: string
) {
  return LoggedMethod({
    operation: operationName,
    logRequest: true,
    logPerformance: true,
    logBusinessEvent: true,
    businessEventName: businessEventName || `business_${operationName}`,
    sensitiveFields: ['token', 'password', 'secret'],
  })
}

/**
 * @name AutoLogged
 * @description Decorator for automatic logging middleware
 * @param options
 * @returns
 */
export function AutoLogged(options: LoggingOptions = {}) {
  return function (
    target: any,
    propertyName: string,
    descriptor?: TypedPropertyDescriptor<ControllerMethod>
  ): TypedPropertyDescriptor<ControllerMethod> | void {
    if (!descriptor || !descriptor.value) {
      console.warn(`Decorator applied to invalid target: ${propertyName}`)
      return
    }

    const method = descriptor.value

    descriptor.value = async function (
      this: any,
      req: Request,
      res: Response,
      next?: NextFunction
    ) {
      const startTime = Date.now()
      const operation =
        options.operation || `${target.constructor.name}.${propertyName}`
      const transactionId = req.transactionId

      try {
        await getSystemLogger().info(
          `🔄 ${operation} - Processing`,
          {
            method: req.method,
            url: req.originalUrl,
            operation,
          },
          transactionId
        )

        const result = await method.call(this, req, res, next)

        const duration = Date.now() - startTime

        await getSystemLogger().performance(
          operation,
          duration,
          {
            statusCode: res.statusCode,
          },
          transactionId
        )

        return result
      } catch (error) {
        const duration = Date.now() - startTime

        await getSystemLogger().error(
          `❌ ${operation} - Failed`,
          error as Error,
          {
            operation,
            duration,
            statusCode: res.statusCode || 500,
          },
          transactionId
        )

        throw error
      }
    } as ControllerMethod

    return descriptor
  }
}
