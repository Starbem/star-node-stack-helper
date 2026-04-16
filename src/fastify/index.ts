import type pino from 'pino'

/**
 * Returns Fastify server options that wire the given Pino root logger into
 * Fastify's built-in logging, producing the same structured JSON format used
 * across all Starbem APIs.
 *
 * Fastify natively accepts a pino Logger instance as its logger — no adapter needed.
 *
 * Usage:
 * ```typescript
 * // tracing.ts — import FIRST in server entrypoint
 * import './tracing'
 *
 * import Fastify from 'fastify'
 * import {
 *   createPinoLogger,
 *   buildFastifyLoggerOptions,
 * } from '@starbemtech/star-node-stack-helper'
 *
 * const rootLogger = createPinoLogger({
 *   serviceName: process.env.DD_SERVICE,
 *   correlationMode: 'datadog',
 * })
 *
 * const app = Fastify(buildFastifyLoggerOptions(rootLogger))
 * ```
 *
 * Fastify will use the same root logger instance for all request logs,
 * and each request gets a child logger bound to `req.id` automatically.
 *
 * @param logger  Root pino Logger created by createPinoLogger.
 * @returns       Object to spread into Fastify constructor options.
 */
export function buildFastifyLoggerOptions(
  logger: pino.Logger,
): { logger: pino.Logger; disableRequestLogging?: boolean } {
  return { logger }
}

/**
 * Returns Fastify options with request logging disabled.
 * Useful when you handle access logging yourself (e.g. via a Fastify hook).
 */
export function buildFastifyLoggerOptionsQuiet(
  logger: pino.Logger,
): { logger: pino.Logger; disableRequestLogging: boolean } {
  return { logger, disableRequestLogging: true }
}
