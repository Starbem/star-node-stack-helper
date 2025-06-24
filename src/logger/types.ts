export interface LoggerConfig {
  node: string
  username: string
  password: string
  index: string
  service: string
  environment: string
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogTransaction {
  name: string
  status: 'success' | 'fail'
  duration: number
  context?: Record<string, unknown>
  requestMeta?: {
    method: string
    path: string
    ip?: string
  }
  error?: {
    message: string
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
