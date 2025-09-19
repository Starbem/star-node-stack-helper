export interface LoggerConfig {
  node: string
  authType?: 'aws' | 'basic'
  username?: string
  password?: string
  index: string
  service: string
  environment: string
  region: string
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogTransaction {
  name: string
  microservice: string
  transactionId?: string
  userId?: string
  appointmentId?: string
  platform?: string
  operation: string
  status: 'success' | 'fail'
  duration: number
  context?: any
  requestMeta?: {
    method: string
    path: string
    ip?: string | undefined
    userAgent?: string | undefined
  }
  responseMeta?: {
    statusCode: number
    data?: any
    responseSize?: number
  }
  error?: {
    message: string
    code?: string
    stack?: string
  }
}

export interface SearchQuery {
  index: string
  fields: string[]
}

export interface OpenSearchHit {
  _index: string
  _id: string
  _score: number
  _source: Record<string, unknown>
}

export interface OpenSearchResponse {
  body: {
    hits: {
      hits: OpenSearchHit[]
    }
  }
}
