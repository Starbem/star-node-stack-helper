import { Request, Response } from '../types/express'
import { RequestData, ResponseData, BusinessData } from '../types/transaction'

/**
 * @name extractRequestData
 * @description Helper function to extract request data
 * @param req
 * @param sensitiveFields
 * @returns
 */
export function extractRequestData(
  req: Request,
  sensitiveFields: string[] = []
): RequestData {
  const data: RequestData = {
    method: req.method,
    url: req.originalUrl,
    ...(req.ip && { ip: req.ip }),
    ...(req.get('User-Agent') && { userAgent: req.get('User-Agent') }),
  }

  // Add parameters
  if (req.params && Object.keys(req.params).length > 0) {
    data.params = req.params
  }

  // Add query parameters (filter sensitive fields)
  if (req.query && Object.keys(req.query).length > 0) {
    data.query = filterSensitiveFields(req.query, sensitiveFields)
  }

  // Add body (filter sensitive fields)
  if (req.body && Object.keys(req.body).length > 0) {
    data.body = filterSensitiveFields(req.body, sensitiveFields)
  }

  // Add relevant headers
  const relevantHeaders = [
    'x-user-id',
    'x-appointment-id',
    'x-platform',
    'authorization',
    'content-type',
    'accept',
  ]

  data.headers = {}
  relevantHeaders.forEach((header) => {
    const value = req.get(header)
    if (value) {
      data.headers![header] = header === 'authorization' ? '[REDACTED]' : value
    }
  })

  return data
}

/**
 * @name extractResponseData
 * @description Helper function to extract response data
 * @param res
 * @returns
 */
export function extractResponseData(res: Response): ResponseData {
  return {
    statusCode: res.statusCode,
    headers: {
      'content-type': res.get('Content-Type'),
      'content-length': res.get('Content-Length'),
    },
  }
}

/**
 * @name extractBusinessData
 * @description Helper function to extract business data
 * @param req
 * @param res
 * @param sensitiveFields
 * @param customExtractors
 * @returns
 */
export function extractBusinessData(
  req: Request,
  res: Response,
  sensitiveFields: string[] = [],
  customExtractors?: Record<string, (req: Request, res: Response) => any>
): BusinessData {
  const data: BusinessData = {
    statusCode: res.statusCode,
  }

  // Add filtered body data
  if (req.body && Object.keys(req.body).length > 0) {
    data.requestData = filterSensitiveFields(req.body, sensitiveFields)
  }

  // Add URL parameters (filtered)
  if (req.params && Object.keys(req.params).length > 0) {
    data.params = filterSensitiveFields(req.params, sensitiveFields)
  }

  // Add query parameters (filtered)
  if (req.query && Object.keys(req.query).length > 0) {
    data.query = filterSensitiveFields(req.query, sensitiveFields)
  }

  // Apply custom extractors if provided
  if (customExtractors) {
    Object.entries(customExtractors).forEach(([key, extractor]) => {
      try {
        const value = extractor(req, res)
        if (value !== undefined) {
          data[key] = value
        }
      } catch (error) {
        console.warn(`Failed to extract custom field ${key}:`, error)
      }
    })
  }

  return data
}

/**
 * @name filterSensitiveFields
 * @description Helper function to filter sensitive fields
 * @param obj
 * @param sensitiveFields
 * @returns
 */
export function filterSensitiveFields(
  obj: any,
  sensitiveFields: string[]
): any {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const filtered = { ...obj }

  sensitiveFields.forEach((field) => {
    if (field in filtered) {
      filtered[field] = '[REDACTED]'
    }
  })

  // Filter nested fields
  Object.keys(filtered).forEach((key) => {
    if (typeof filtered[key] === 'object' && filtered[key] !== null) {
      filtered[key] = filterSensitiveFields(filtered[key], sensitiveFields)
    }
  })

  return filtered
}

/**
 * @name generateTransactionId
 * @description Helper function to generate a unique transaction ID
 * @returns
 */
export function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * @name generateRequestId
 * @description Helper function to generate a unique request ID
 * @returns
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
