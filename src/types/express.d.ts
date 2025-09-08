// Type definitions for Express.js integration
// This file provides type definitions for Express.js types used in the library

export interface Request {
  method: string
  url: string
  originalUrl: string
  params: Record<string, any>
  query: Record<string, any>
  body: any
  ip?: string
  connection?: {
    remoteAddress?: string
  }
  headers: Record<string, string | string[] | undefined>
  get(name: string): string | undefined
  transactionId?: string
  requestId?: string
}

export interface Response {
  statusCode: number
  headers: Record<string, string | string[] | undefined>
  setHeader(name: string, value: string): void
  get(name: string): string | undefined
  send(data?: any): any
  json(data?: any): any
  status(code: number): Response
  on(event: string, listener: (...args: any[]) => void): void
}

export type NextFunction = (error?: any) => void
