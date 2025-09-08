/**
 * @name TransactionData
 * @description Interface for transaction logs
 */
export interface TransactionData {
  name: string
  transactionId?: string
  operation: string
  status: 'success' | 'fail'
  duration: number
  context?: Record<string, any>
  requestMeta?: {
    method: string
    path: string
    ip?: string | undefined
    userAgent?: string | undefined
  }
  responseMeta?: {
    statusCode: number
    responseSize?: number
  }
  error?: {
    message: string
    code?: string
    stack?: string
  }
  // Custom fields can be added dynamically
  [key: string]: any
}

/**
 * @name TransactionLoggerConfig
 * @description Interface for transaction logging config
 */
export interface TransactionLoggerConfig {
  operation: string
  sensitiveFields?: string[]
  logRequest?: boolean
  logResponse?: boolean
  logPerformance?: boolean
  logBusinessEvent?: boolean
  businessEventName?: string
  customExtractors?: Record<string, (req: any, res: any) => any>
  customFields?: Record<string, any>
}

/**
 * @name RequestData
 * @description Interface for request data
 */
export interface RequestData {
  method: string
  url: string
  ip?: string | undefined
  userAgent?: string | undefined
  params?: Record<string, any>
  query?: Record<string, any>
  body?: Record<string, any>
  headers?: Record<string, any>
}

/**
 * @name ResponseData
 * @description Interface for response data
 */
export interface ResponseData {
  statusCode: number
  headers?: Record<string, any>
  responseSize?: number
}

/**
 * @name BusinessData
 * @description Interface for business data
 */
export interface BusinessData {
  statusCode: number
  requestData?: Record<string, any>
  params?: Record<string, any>
  query?: Record<string, any>
  // Custom fields can be added dynamically
  [key: string]: any
}
