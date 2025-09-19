import * as express from 'express'
import {
  ElasticLogger,
  LoggerConfig,
  loadSecrets,
  testSavedSecrets,
  transactionLoggerMiddleware,
  createPinoLogger,
  createHttpLogger,
  performanceLoggerMiddleware,
  pinoLogContext,
  sendSlackMessage,
  createButtonElement,
  createSectionBlock,
  createActionBlock,
  SlackConfig,
} from '../src'

/**
 * Examples of usage for the star-node-stack-helper library
 *
 * Available endpoints:
 * - /pino-logs/basic - Basic example of logs with pinoLogger
 * - /pino-logs/context - Example using pinoLogContext to structure logs
 * - /pino-logs/advanced - Advanced example with different levels and contexts
 * - /pino-logs/proxy - Example of proxy/API Gateway log
 * - /performance-test - Example of performance logger middleware
 * - /performance-test/slow - Example of slow operation with performance logger
 * - /system-logs/add - Example of system logs with ElasticLogger
 * - /transaction-logs/add - Example of transaction logs with middleware
 * - /transaction-logs/create-user - POST - Create user with transaction logger
 * - /transaction-logs/update-user/:id - PUT - Update user with transaction logger
 * - /transaction-logs/delete-user/:id - DELETE - Delete user with transaction logger
 * - /system-logs - Search system logs
 * - /transaction-logs - Search transaction logs with middleware
 * - /secrets - Example of loading secrets
 */

const loggerConfig: LoggerConfig = {
  authType: 'aws',
  service: 'star-node-stack-helper-example',
  environment: 'dev',
  // username: 'admin',
  // password: 'Teste@2025',
  node: 'https://kpeu8wpqqhglaa92dhx1.us-east-2.aoss.amazonaws.com',
  index: 'system-logs',
  region: 'us-east-2',
}

// TODO: Add logger config example
const logger = new ElasticLogger(loggerConfig)
const pinoLogger = createPinoLogger({
  serviceName: 'star-node-stack-helper-example',
  environment: 'development',
  logLevel: 'info',
})
const httpLogger = createHttpLogger(pinoLogger)

const app = express()

// TODO: Add http logger middleware example
app.use(httpLogger)

// TODO: Add pino logger examples
app.get('/pino-logs/basic', async (req, res) => {
  // Exemplo básico de uso do pinoLogger
  pinoLogger.info('Basic information log', {
    userId: '123',
    action: 'user_login',
    timestamp: new Date().toISOString(),
  })

  pinoLogger.warn('Warning log', {
    message: 'Usuário tentou acessar recurso sem permissão',
    userId: '123',
    resource: '/admin/users',
  })

  pinoLogger.error('Error log', {
    message: 'Falha ao conectar com banco de dados',
    error: 'Connection timeout',
    retryCount: 3,
  })

  res.json({
    message: 'Logs pino created successfully',
    logs: ['info', 'warn', 'error'],
  })
})

app.get('/pino-logs/context', async (req, res) => {
  // Example using pinoLogContext to structure logs
  const requestContext = pinoLogContext.request(req, {
    userId: '456',
    sessionId: 'sess_789',
  })

  pinoLogger.info('User action executed', {
    ...requestContext,
    action: 'create_video_room',
    roomId: 'room_123',
    participants: 5,
  })

  // Example of performance log
  const startTime = Date.now()
  // Simulate operation
  await new Promise((resolve) => setTimeout(resolve, 100))
  const duration = Date.now() - startTime

  const performanceContext = pinoLogContext.performance(
    'create_video_room',
    duration,
    {
      roomId: 'room_123',
      participants: 5,
    }
  )

  pinoLogger.info('Operation completed successfully', {
    ...requestContext,
    ...performanceContext,
    success: true,
  })

  res.json({
    message: 'Logs with context created successfully',
    duration: `${duration}ms`,
  })
})

app.get('/pino-logs/advanced', async (req, res) => {
  // Example of advanced with different log levels
  const userId = (req.query.userId as string) || 'anonymous'
  const operation = 'advanced_operation'

  // Log of start of the operation
  pinoLogger.info('Starting advanced operation', {
    ...pinoLogContext.request(req, { userId, operation }),
    step: 'start',
    metadata: {
      version: '1.0.0',
      feature: 'advanced_logging',
    },
  })

  try {
    // Simulate different steps of the operation
    const steps = ['validation', 'processing', 'database', 'response']

    for (const step of steps) {
      const stepStart = Date.now()

      // Simulate step work
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stepDuration = Date.now() - stepStart

      pinoLogger.debug(`Step ${step} completed`, {
        ...pinoLogContext.performance(step, stepDuration),
        userId,
        operation,
        step,
        progress: `${steps.indexOf(step) + 1}/${steps.length}`,
      })
    }

    // Log of success
    pinoLogger.info('Advanced operation completed successfully', {
      ...pinoLogContext.request(req, { userId, operation }),
      ...pinoLogContext.performance(operation, 200), // 200ms total
      result: 'success',
      dataProcessed: 42,
    })

    res.json({
      message: 'Advanced operation completed',
      userId,
      steps: steps.length,
      totalDuration: '200ms',
    })
  } catch (error) {
    // Log of error with complete context
    pinoLogger.error('Error in advanced operation', {
      ...pinoLogContext.request(req, { userId, operation }),
      ...pinoLogContext.error(error, {
        step: 'processing',
        retryable: true,
      }),
      severity: 'high',
    })

    res.status(500).json({
      message: 'Error in advanced operation',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

app.get('/pino-logs/proxy', async (req, res) => {
  // Example of proxy/API Gateway log
  const target = 'https://api.example.com'
  const service = 'user-service'
  const startTime = Date.now()

  // Simulate external API call
  await new Promise((resolve) => setTimeout(resolve, 150))
  const responseTime = Date.now() - startTime

  const proxyContext = pinoLogContext.proxy(target, service, {
    method: 'GET',
    endpoint: '/users/123',
    responseTime,
    statusCode: 200,
  })

  pinoLogger.info('API Gateway request completed', {
    ...proxyContext,
    ...pinoLogContext.request(req),
    success: true,
  })

  res.json({
    message: 'Proxy log example completed',
    target,
    service,
    responseTime: `${responseTime}ms`,
  })
})

// TODO: Add performance logger example
app.get(
  '/performance-test',
  performanceLoggerMiddleware('video-ms', 'performance_test', 'development'),
  async (req, res) => {
    // Simulate operation that takes a little bit
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000))

    res.json({
      message: 'Performance test operation completed',
      timestamp: new Date().toISOString(),
      randomDelay: '0-1000ms',
    })
  }
)

app.get(
  '/performance-test/slow',
  performanceLoggerMiddleware('video-ms', 'slow_operation', 'development'),
  async (req, res) => {
    // Simulate slow operation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    res.json({
      message: 'Slow operation completed',
      duration: '2000ms',
      timestamp: new Date().toISOString(),
    })
  }
)

// TODO: Add system logs example
app.get('/system-logs/add', async (req, res) => {
  const level = 'info'
  const message = 'Log example message'
  const body = {
    id: '123',
    timestamp: new Date().toISOString(),
  }

  await logger.log('debug', 'Log example message', {
    body,
  })

  await logger.log('info', 'Log example message', {
    body,
  })

  await logger.log('warn', 'Log example message', {
    body,
  })

  await logger.log('error', 'Log example message', {
    body,
  })

  res.json({
    message: 'Log saved successfully',
    data: {
      level,
      message,
      body,
    },
  })
})

// TODO: Add transaction example
app.get(
  '/transaction-logs/add',
  transactionLoggerMiddleware('video-ms', 'create-transaction-log', logger),
  async (req, res) => {
    // The middleware automatically captures the transaction data
    // Here you can add specific logic for the operation

    const body = {
      microservice: 'video-ms',
      name: 'Transaction example Create Room Token 2',
      operation: 'create-transaction-log',
      status: 'success' as const,
      duration: 1000,
      context: {
        message: 'Log example Create Room Token',
        id: '123',
        timestamp: new Date().toISOString(),
        type: 'transaction',
        data: {
          name: 'John Doe',
          email: 'john.doe@example.com',
        },
      },
      requestMeta: {
        method: 'GET',
        path: '/logs-transactions/add/create-room-token',
        ip: '127.0.0.1',
      },
    }

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 100))

    res.json({
      message: 'Transaction log saved successfully',
      body,
      transactionId: req.transactionId, // ID generated by the middleware
    })
  }
)

// TODO: Add more transaction logger examples
app.post(
  '/transaction-logs/create-user',
  transactionLoggerMiddleware('video-ms', 'create-user', logger),
  async (req, res) => {
    try {
      const { name, email, role } = req.body

      // Simulate validation
      if (!name || !email) {
        res.status(400).json({
          message: 'Name and email are required',
          transactionId: req.transactionId,
        })
        return
      }

      // Simulate user creation process
      await new Promise((resolve) => setTimeout(resolve, 300))

      const user = {
        id: `user_${Date.now()}`,
        name,
        email,
        role: role || 'user',
        createdAt: new Date().toISOString(),
      }

      res.status(201).json({
        message: 'User created successfully',
        user,
        transactionId: req.transactionId,
      })
    } catch (error) {
      res.status(500).json({
        message: 'Error creating user',
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId: req.transactionId,
      })
    }
  }
)

app.put(
  '/transaction-logs/update-user/:id',
  transactionLoggerMiddleware('video-ms', 'update-user', logger),
  async (req, res) => {
    try {
      const { id } = req.params
      const { name, email, role } = req.body

      // Simulate user search
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Simulate update
      await new Promise((resolve) => setTimeout(resolve, 200))

      const updatedUser = {
        id,
        name: name || 'Updated Name',
        email: email || 'updated@example.com',
        role: role || 'user',
        updatedAt: new Date().toISOString(),
      }

      res.json({
        message: 'User updated successfully',
        user: updatedUser,
        transactionId: req.transactionId,
      })
    } catch (error) {
      res.status(500).json({
        message: 'Error updating user',
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId: req.transactionId,
      })
    }
  }
)

app.delete(
  '/transaction-logs/delete-user/:id',
  transactionLoggerMiddleware('video-ms', 'delete-user', logger),
  async (req, res) => {
    try {
      const { id } = req.params

      // Simulate user existence check
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Simulate deletion
      await new Promise((resolve) => setTimeout(resolve, 250))

      res.json({
        message: 'User deleted successfully',
        deletedUserId: id,
        transactionId: req.transactionId,
      })
    } catch (error) {
      res.status(500).json({
        message: 'Error deleting user',
        error: error instanceof Error ? error.message : 'Unknown error',
        transactionId: req.transactionId,
      })
    }
  }
)

// TODO: search system logs example
app.get('/system-logs', async (req, res) => {
  const logs = await logger.getSystemLogs('Log example')
  res.json({
    message: 'Logs fetched successfully',
    logs,
  })
})

// TODO: search logs transactions example
app.get(
  '/transaction-logs',
  transactionLoggerMiddleware('video-ms', 'search-transaction-logs', logger),
  async (req: express.Request, res: express.Response) => {
    const query = req.query as { q: string }
    console.log('query', query)

    // Simulate search with delay
    await new Promise((resolve) => setTimeout(resolve, 200))

    const transactions = await logger.getLogsTransactions(query.q)
    res.json({
      message: 'Transactions fetched successfully',
      transactions,
      transactionId: req.transactionId, // ID generated by the middleware
      searchQuery: query.q,
    })
  }
)

app.get('/slack-test', async (req, res) => {
  const config: SlackConfig = {
    token: 'your-slack-token',
    defaultChannel: '#your-channel', // Optional
    botName: 'Starbem Tech',
  }

  const blocks = [
    createSectionBlock('🤝 *Job Renovação Parceiros*"', { type: 'mrkdwn' }),
    createSectionBlock('✅ Planos de parceiros renovados com sucesso!', {
      type: 'mrkdwn',
    }),
    createSectionBlock('', {
      fields: [
        { type: 'mrkdwn', text: '*Assinaturas renovadas:*' },
        { type: 'mrkdwn', text: '10' },
        { type: 'mrkdwn', text: '*Data de execução:*' },
        { type: 'mrkdwn', text: '2025-09-19 10:00:00' },
        { type: 'mrkdwn', text: '*Tempo de execução:*' },
        { type: 'mrkdwn', text: '1000ms' },
        { type: 'mrkdwn', text: '*Status:*' },
        { type: 'mrkdwn', text: 'Sucesso' },
      ],
    }),
  ]

  const response = await sendSlackMessage(
    {
      channel: '#your-channel',
      text: 'Job Renovação Parceiros realizado com sucesso!',
      blocks,
    },
    {
      config,
    }
  )

  res.json({
    message: 'Slack message sent successfully',
    response,
  })
})

// TODO: add secrets example
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

// TODO: start server example
app.listen(3000, () => {
  console.log('Server is running on port 3000')
})
