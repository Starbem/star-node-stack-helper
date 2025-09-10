import { SetMetadata } from '@nestjs/common'

export const LOG_METADATA_KEY = 'log_metadata'

export interface LogMetadata {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message?: string
  context?: Record<string, unknown>
  skipRequestLogging?: boolean
  skipResponseLogging?: boolean
}

/**
 * Decorator to configure method logging
 *
 * @example
 * ```typescript
 * @Log({ level: 'info', message: 'User created successfully' })
 * async createUser(userData: CreateUserDto) {
 *   // method implementation
 * }
 * ```
 */
export const Log = (metadata: LogMetadata = {}) =>
  SetMetadata(LOG_METADATA_KEY, metadata)

/**
 * Decorator for performance logging
 *
 * @example
 * ```typescript
 * @LogPerformance('user-creation')
 * async createUser(userData: CreateUserDto) {
 *   // method implementation
 * }
 * ```
 */
export const LogPerformance = (operation: string) =>
  SetMetadata(LOG_METADATA_KEY, {
    level: 'info',
    message: `Performance: ${operation}`,
    context: { operation },
  })

/**
 * Decorator for error logging
 *
 * @example
 * ```typescript
 * @LogError('Failed to create user')
 * async createUser(userData: CreateUserDto) {
 *   // method implementation
 * }
 * ```
 */
export const LogError = (message: string, context?: Record<string, unknown>) =>
  SetMetadata(LOG_METADATA_KEY, {
    level: 'error',
    message,
    context,
  })

/**
 * Decorator for critical operations logging
 *
 * @example
 * ```typescript
 * @LogCritical('User authentication failed')
 * async authenticateUser(credentials: LoginDto) {
 *   // method implementation
 * }
 * ```
 */
export const LogCritical = (
  message: string,
  context?: Record<string, unknown>
) =>
  SetMetadata(LOG_METADATA_KEY, {
    level: 'fatal',
    message,
    context,
  })
