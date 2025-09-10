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
} from '../src'

/**
 * Exemplos de uso da lib star-node-stack-helper
 *
 * Endpoints disponíveis:
 * - /pino-logs/basic - Exemplo básico de logs com pinoLogger
 * - /pino-logs/context - Exemplo usando pinoLogContext para estruturar logs
 * - /pino-logs/advanced - Exemplo avançado com diferentes níveis e contextos
 * - /performance-test - Exemplo de performance logger middleware
 * - /performance-test/slow - Exemplo de operação lenta com performance logger
 * - /system-logs/add - Exemplo de system logs com ElasticLogger
 * - /transaction-logs/add - Exemplo de transaction logs com middleware
 * - /transaction-logs/create-user - POST - Criar usuário com transaction logger
 * - /transaction-logs/update-user/:id - PUT - Atualizar usuário com transaction logger
 * - /transaction-logs/delete-user/:id - DELETE - Deletar usuário com transaction logger
 * - /system-logs - Buscar system logs
 * - /transaction-logs - Buscar transaction logs com middleware
 * - /secrets - Exemplo de carregamento de secrets
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
  serviceName: 'video-ms',
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
  pinoLogger.info('Log básico de informação', {
    userId: '123',
    action: 'user_login',
    timestamp: new Date().toISOString(),
  })

  pinoLogger.warn('Log de aviso', {
    message: 'Usuário tentou acessar recurso sem permissão',
    userId: '123',
    resource: '/admin/users',
  })

  pinoLogger.error('Log de erro', {
    message: 'Falha ao conectar com banco de dados',
    error: 'Connection timeout',
    retryCount: 3,
  })

  res.json({
    message: 'Logs pino criados com sucesso',
    logs: ['info', 'warn', 'error'],
  })
})

app.get('/pino-logs/context', async (req, res) => {
  // Exemplo usando pinoLogContext para estruturar logs
  const requestContext = pinoLogContext.request(req, {
    userId: '456',
    sessionId: 'sess_789',
  })

  pinoLogger.info('Ação do usuário executada', {
    ...requestContext,
    action: 'create_video_room',
    roomId: 'room_123',
    participants: 5,
  })

  // Exemplo de log de performance
  const startTime = Date.now()
  // Simular operação
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

  pinoLogger.info('Operação concluída com sucesso', {
    ...requestContext,
    ...performanceContext,
    success: true,
  })

  res.json({
    message: 'Logs com contexto criados com sucesso',
    duration: `${duration}ms`,
  })
})

app.get('/pino-logs/advanced', async (req, res) => {
  // Exemplo avançado com diferentes níveis de log
  const userId = (req.query.userId as string) || 'anonymous'
  const operation = 'advanced_operation'

  // Log de início da operação
  pinoLogger.info('Iniciando operação avançada', {
    ...pinoLogContext.request(req, { userId, operation }),
    step: 'start',
    metadata: {
      version: '1.0.0',
      feature: 'advanced_logging',
    },
  })

  try {
    // Simular diferentes etapas da operação
    const steps = ['validation', 'processing', 'database', 'response']

    for (const step of steps) {
      const stepStart = Date.now()

      // Simular trabalho da etapa
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stepDuration = Date.now() - stepStart

      pinoLogger.debug(`Etapa ${step} concluída`, {
        ...pinoLogContext.performance(step, stepDuration),
        userId,
        operation,
        step,
        progress: `${steps.indexOf(step) + 1}/${steps.length}`,
      })
    }

    // Log de sucesso
    pinoLogger.info('Operação avançada concluída com sucesso', {
      ...pinoLogContext.request(req, { userId, operation }),
      ...pinoLogContext.performance(operation, 200), // 200ms total
      result: 'success',
      dataProcessed: 42,
    })

    res.json({
      message: 'Operação avançada concluída',
      userId,
      steps: steps.length,
      totalDuration: '200ms',
    })
  } catch (error) {
    // Log de erro com contexto completo
    pinoLogger.error('Erro na operação avançada', {
      ...pinoLogContext.request(req, { userId, operation }),
      ...pinoLogContext.error(error, {
        step: 'processing',
        retryable: true,
      }),
      severity: 'high',
    })

    res.status(500).json({
      message: 'Erro na operação avançada',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// TODO: Add performance logger example
app.get(
  '/performance-test',
  performanceLoggerMiddleware('video-ms', 'performance_test', 'development'),
  async (req, res) => {
    // Simular operação que demora um pouco
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000))

    res.json({
      message: 'Operação de performance test concluída',
      timestamp: new Date().toISOString(),
      randomDelay: '0-1000ms',
    })
  }
)

app.get(
  '/performance-test/slow',
  performanceLoggerMiddleware('video-ms', 'slow_operation', 'development'),
  async (req, res) => {
    // Simular operação lenta
    await new Promise((resolve) => setTimeout(resolve, 2000))

    res.json({
      message: 'Operação lenta concluída',
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
    // O middleware já captura automaticamente os dados da transação
    // Aqui você pode adicionar lógica específica da operação

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

    // Simular processamento
    await new Promise((resolve) => setTimeout(resolve, 100))

    res.json({
      message: 'Log transaction saved successfully',
      body,
      transactionId: req.transactionId, // ID gerado pelo middleware
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

      // Simular validação
      if (!name || !email) {
        res.status(400).json({
          message: 'Name and email are required',
          transactionId: req.transactionId,
        })
        return
      }

      // Simular criação de usuário
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

      // Simular busca do usuário
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Simular atualização
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

      // Simular verificação se usuário existe
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Simular exclusão
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

    // Simular busca com delay
    await new Promise((resolve) => setTimeout(resolve, 200))

    const transactions = await logger.getLogsTransactions(query.q)
    res.json({
      message: 'Transactions fetched successfully',
      transactions,
      transactionId: req.transactionId, // ID gerado pelo middleware
      searchQuery: query.q,
    })
  }
)

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
