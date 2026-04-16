/**
 * Mixin functions that inject trace/span context fields into Pino log records.
 *
 * IMPORTANT for 'datadog' mode: dd-trace MUST be initialized BEFORE this
 * module (and before pino) is first imported. The recommended entrypoint pattern:
 *
 * ```typescript
 * // tracing.ts — must be the FIRST import in main.ts / server entrypoint
 * import ddTrace from 'dd-trace'
 * ddTrace.init({ service: process.env.DD_SERVICE, logInjection: false })
 * ```
 *
 * Then in main.ts:
 * ```typescript
 * import './tracing'           // FIRST
 * import { createPinoLogger } from '@starbemtech/star-node-stack-helper'
 * ```
 */

export type CorrelationFields = Record<string, unknown>

/**
 * Returns Datadog trace context fields (`dd.trace_id`, `dd.span_id`, etc.)
 * from the currently active dd-trace span.
 * Falls back to empty object if dd-trace is not installed or no span is active.
 */
export function getDatadogCorrelationFields(): CorrelationFields {
  try {
    // Dynamic require — safe peer dep: if not installed, falls through to catch
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracer = require('dd-trace')
    const span = tracer?.scope?.()?.active?.()
    if (!span) return {}
    const ctx = span.context?.()
    if (!ctx) return {}
    const traceId: string | undefined = ctx.toTraceId?.()
    const spanId: string | undefined = ctx.toSpanId?.()
    if (!traceId && !spanId) return {}
    return {
      dd: {
        trace_id: traceId,
        span_id: spanId,
        service: process.env['DD_SERVICE'],
        env: process.env['DD_ENV'],
        version: process.env['DD_VERSION'],
      },
    }
  } catch {
    return {}
  }
}

/**
 * Returns OpenTelemetry trace context fields (`trace_id`, `span_id`)
 * from the currently active OTel span.
 * Falls back to empty object if @opentelemetry/api is not installed.
 */
export function getOtelCorrelationFields(): CorrelationFields {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const api = require('@opentelemetry/api')
    const span = api?.trace?.getActiveSpan?.()
    if (!span) return {}
    const ctx = span.spanContext?.()
    if (!ctx?.traceId) return {}
    return {
      trace_id: ctx.traceId as string,
      span_id: ctx.spanId as string,
    }
  } catch {
    return {}
  }
}
