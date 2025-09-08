import * as express from 'express'
import { RequestHandler } from 'express'
import {
  // initializeLogger,
  getSystemLogger,
  getPinoLogger,
  loadSecrets,
  testSavedSecrets,
  transactionLogger,
  addTransactionId,
} from '../src'

// Initialize the new logging system
async function initializeLogging() {
  try {
    // Option 1: Use environment-based config (reads from process.env)
    // const result = await initializeLogger('star-node-stack-helper-example', 'development')
    // initializeLogger('star-node-stack-helper-example', 'development')

    // Option 2: Manual configuration (recommended for examples)
    const { LoggerFactory } = await import('../src')

    const result = await LoggerFactory.initialize({
      authType: 'aws',
      opensearch: {
        node:
          process.env['OPENSEARCH_NODE'] ||
          'https://kpeu8wpqqhglaa92dhx1.us-east-2.aoss.amazonaws.com',
        // username: process.env['OPENSEARCH_USERNAME'] || 'admin',
        // password: process.env['OPENSEARCH_PASSWORD'] || 'admin',
        // region: process.env['AWS_REGION'] || 'us-east-1',
        region: 'us-east-2',
      },
      service: {
        name: 'star-node-stack-helper-example',
        environment: 'development',
        index: 'example-logs',
      },
      logging: {
        level: 'info',
        enableTransactionLogs: true,
        enableSystemLogs: true,
        sensitiveFields: ['password', 'token', 'secret', 'authorization'],
      },
    })

    if (!result.success) {
      console.warn(
        '⚠️ OpenSearch not available, using PinoLogger only:',
        result.error
      )
      console.log('✅ PinoLogger initialized successfully')
      return true // Continue with PinoLogger only
    }

    console.log('✅ Full logging system initialized successfully')
    return true
  } catch (error) {
    console.warn(
      '⚠️ Failed to initialize logging system, using PinoLogger only:',
      error
    )
    console.log('✅ PinoLogger initialized successfully')
    return true // Continue with PinoLogger only
  }
}

const app = express()

// Add middleware
app.use(express.json())
app.use(addTransactionId as unknown as RequestHandler)

// System logs example using new SystemLogger or PinoLogger
app.get('/system-logs/add', async (req, res) => {
  const systemLogger = getSystemLogger()
  const pinoLogger = getPinoLogger()
  const transactionId = req.transactionId

  const logData = {
    id: '123',
    timestamp: new Date().toISOString(),
    operation: 'system_log_example',
    transactionId,
  }

  try {
    // Try SystemLogger first (if OpenSearch is available)
    await systemLogger.info(
      'System log example message',
      logData,
      transactionId
    )
  } catch (error) {
    // Fallback to PinoLogger
    pinoLogger.info('System log example message', logData)
  }

  res.json({
    message: 'System log saved successfully',
    transactionId,
    logger: systemLogger ? 'SystemLogger + OpenSearch' : 'PinoLogger only',
  })
})

// Transaction logs example using new SystemLogger or PinoLogger
app.get(
  '/transaction-logs/add',
  transactionLogger('transaction_example', {
    sensitiveFields: ['password', 'token'],
    customExtractors: {
      userId: (req: any) => req.headers['x-user-id'],
    },
  }) as unknown as RequestHandler,
  async (req, res) => {
    const systemLogger = getSystemLogger()
    const pinoLogger = getPinoLogger()
    const transactionId = req.transactionId

    const businessData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      operation: 'transaction_example',
      transactionId,
    }

    try {
      // Try SystemLogger first (if OpenSearch is available)
      await systemLogger.businessEvent(
        'transaction_created',
        businessData,
        transactionId
      )
    } catch (error) {
      // Fallback to PinoLogger
      pinoLogger.business('transaction_created', businessData)
    }

    res.json({
      message: 'Transaction log saved successfully',
      transactionId,
      logger: systemLogger ? 'SystemLogger + OpenSearch' : 'PinoLogger only',
    })
  }
)

// Search system logs example
app.get('/system-logs', async (req, res) => {
  const systemLogger = getSystemLogger()
  const { searchTerm, transactionId } = req.query

  try {
    const logs = await systemLogger.getSystemLogs(
      searchTerm as string,
      transactionId as string
    )

    res.json({
      message: 'System logs fetched successfully',
      logs,
      total: logs.length,
      source: 'OpenSearch',
    })
  } catch (error) {
    res.json({
      message: 'OpenSearch not available - logs are only in console',
      logs: [],
      total: 0,
      source: 'PinoLogger (console only)',
      note: 'Check your console for Pino logs',
    })
  }
})

// Search transaction logs example
app.get('/transaction-logs', async (req, res) => {
  const systemLogger = getSystemLogger()
  const { transactionId } = req.query

  console.log('transactionId', transactionId)

  try {
    const transactions = await systemLogger.getTransactionLogs(
      ['transaction_example'],
      transactionId as string
    )

    res.json({
      message: 'Transaction logs fetched successfully',
      transactions,
      total: transactions.length,
      source: 'OpenSearch',
    })
  } catch (error) {
    res.json({
      message: 'OpenSearch not available - logs are only in console',
      transactions: [],
      total: 0,
      source: 'PinoLogger (console only)',
      note: 'Check your console for Pino logs',
    })
  }
})

// Secrets example
app.get('/secrets', async (req, res) => {
  const secrets = await loadSecrets({
    region: 'us-east-2',
    secretName: ['dev/video-microservice/env', 'dev/notification-service/env'],
  })

  console.log(secrets)
  testSavedSecrets()

  res.json({
    message: 'Secrets fetched successfully',
    secrets,
  })
})

// Pino logger example
app.get('/pino-logs', async (req, res) => {
  const pinoLogger = getPinoLogger()

  pinoLogger.info('Pino log example', {
    operation: 'pino_example',
    timestamp: new Date().toISOString(),
  })

  pinoLogger.warn('Pino warning example', {
    level: 'warning',
    message: 'This is a warning',
  })

  pinoLogger.error('Pino error example', {
    error: new Error('Sample error'),
    context: 'pino_error_test',
  })

  res.json({
    message: 'Pino logs created successfully',
    check: 'Check your console for Pino logs',
  })
})

// Example without decorators (simplified)
app.post(
  '/users',
  transactionLogger('create_user', {
    sensitiveFields: ['password'],
    customExtractors: {
      userId: (req: any) => req.headers['x-user-id'],
    },
  }) as unknown as RequestHandler,
  async (req, res) => {
    const { name, email } = req.body
    const systemLogger = getSystemLogger()
    const pinoLogger = getPinoLogger()
    const transactionId = req.transactionId

    const userData = { name, email, transactionId }

    try {
      // Try SystemLogger first (if OpenSearch is available)
      await systemLogger.businessEvent(
        'user_creation_started',
        userData,
        transactionId
      )
    } catch (error) {
      // Fallback to PinoLogger
      pinoLogger.business('user_creation_started', userData)
    }

    const user = {
      id: `user_${Date.now()}`,
      name,
      email,
      createdAt: new Date().toISOString(),
    }

    res.json({
      message: 'User created successfully',
      user,
      transactionId,
      logger: systemLogger ? 'SystemLogger + OpenSearch' : 'PinoLogger only',
    })
  }
)

// Start server
async function startServer() {
  const loggingInitialized = await initializeLogging()

  if (!loggingInitialized) {
    console.error('❌ Failed to initialize logging system')
    process.exit(1)
  }

  app.listen(3000, () => {
    console.log('🚀 Server is running on port 3000')
    console.log('📊 System logs: http://localhost:3000/system-logs/add')
    console.log(
      '📝 Transaction logs: http://localhost:3000/logs-transactions/add'
    )
    console.log('🔍 Search logs: http://localhost:3000/system-logs')
    console.log('🔐 Secrets: http://localhost:3000/secrets')
    console.log('📋 Pino logs: http://localhost:3000/pino-logs')
    console.log('👤 Create user: http://localhost:3000/users')
  })
}

startServer().catch((error) => {
  console.error('❌ Error starting server:', error)
  process.exit(1)
})
