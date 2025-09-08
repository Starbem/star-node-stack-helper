import { Request, Response, NextFunction } from '../types/express'

/**
 * @name addRequestId
 * @description Middleware to add request ID to all requests
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const addRequestId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    (req.headers['x-transaction-id'] as string) ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  req.requestId = requestId

  res.setHeader('X-Request-ID', requestId)

  next()
}

/**
 * @name Request
 * @description Extends the Request interface to include requestId
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string
    }
  }
}
