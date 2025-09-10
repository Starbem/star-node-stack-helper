import { SetMetadata } from '@nestjs/common'

export const TRANSACTION_LOG_METADATA_KEY = 'transaction_log_metadata'

export interface TransactionLogMetadata {
  microservice: string
  operation: string
  skipTransactionLogging?: boolean
  customContext?: Record<string, unknown>
}

/**
 * Decorator to configure transaction logging
 *
 * @example
 * ```typescript
 * @TransactionLog({
 *   microservice: 'user-service',
 *   operation: 'create-user'
 * })
 * async createUser(userData: CreateUserDto) {
 *   // method implementation
 * }
 * ```
 */
export const TransactionLog = (metadata: TransactionLogMetadata) =>
  SetMetadata(TRANSACTION_LOG_METADATA_KEY, metadata)
