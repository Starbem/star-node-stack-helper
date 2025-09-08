/**
 * Express.js integration example
 *
 * This example demonstrates how to use the integrated logging system
 * with a generic Express.js application
 */

import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from 'express'
import {
  initializeLogger,
  transactionLogger,
  addTransactionId,
  getSystemLogger,
  LoggedMethod,
  LoggedApiOperation,
  LoggedBusinessOperation,
} from '../src'

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

async function initializeLogging() {
  try {
    const result = await initializeLogger('example-service', 'development')

    if (!result.success) {
      console.error('❌ Falha ao inicializar logging:', result.error)
      return false
    }

    console.log('✅ Sistema de logging inicializado com sucesso')
    return true
  } catch (error) {
    console.error('❌ Erro ao inicializar logging:', error)
    return false
  }
}

app.use(addTransactionId as unknown as RequestHandler)

const performanceMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    getSystemLogger().performance(
      'http_request',
      duration,
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      },
      req.transactionId
    )
  })

  next()
}

app.use(performanceMiddleware)

class ExampleController {
  // @ts-ignore - Decorator signature issue with TypeScript strict mode
  @LoggedApiOperation('create_resource', {
    logRequest: true,
    logPerformance: true,
    logBusinessEvent: true,
    businessEventName: 'resource_created',
    sensitiveFields: ['token', 'password', 'secret'],
  })
  async createResource(req: Request, res: Response) {
    const { name, description } = req.body
    const transactionId = req.transactionId

    await getSystemLogger().info(
      '📝 Iniciando criação de recurso',
      {
        resourceName: name,
        hasDescription: !!description,
        operation: 'create_resource',
      },
      transactionId
    )

    try {
      const resource = {
        id: `res_${Date.now()}`,
        name,
        description,
        createdAt: new Date().toISOString(),
      }

      await getSystemLogger().businessEvent(
        'resource_created',
        {
          resourceId: resource.id,
          resourceName: name,
          hasDescription: !!description,
        },
        transactionId
      )

      res.json(resource)
    } catch (error) {
      await getSystemLogger().error(
        '❌ Erro ao criar recurso',
        error as Error,
        { resourceName: name },
        transactionId
      )

      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // @ts-ignore - Decorator signature issue with TypeScript strict mode
  @LoggedBusinessOperation('process_payment', 'payment_processed')
  async processPayment(req: Request, res: Response) {
    const { amount, currency, paymentMethod } = req.body
    const transactionId = req.transactionId

    await getSystemLogger().businessEvent(
      'payment_processing_started',
      {
        amount,
        currency,
        paymentMethod: paymentMethod ? '[REDACTED]' : undefined,
      },
      transactionId
    )

    const payment = {
      id: `pay_${Date.now()}`,
      amount,
      currency,
      status: 'completed',
      processedAt: new Date().toISOString(),
    }

    res.json(payment)
  }

  // @ts-ignore - Decorator signature issue with TypeScript strict mode
  @LoggedMethod({
    operation: 'validate_data',
    logRequest: true,
    logPerformance: true,
    logBusinessEvent: true,
    businessEventName: 'data_validated',
    sensitiveFields: ['token', 'password'],
  })
  async validateData(req: Request, res: Response) {
    const { data } = req.body

    const isValid = data && typeof data === 'object'

    res.json({
      valid: isValid,
      timestamp: new Date().toISOString(),
      dataType: typeof data,
    })
  }
}

const exampleController = new ExampleController()

app.post(
  '/api/resources',
  transactionLogger('create_resource', {
    sensitiveFields: ['password', 'token', 'secret'],
    customExtractors: {
      userId: (req: any) => req.headers['x-user-id'],
      tenantId: (req: any) => req.headers['x-tenant-id'],
    },
  }) as unknown as RequestHandler,
  exampleController.createResource.bind(exampleController)
)

app.post(
  '/api/payments',
  transactionLogger('process_payment', {
    sensitiveFields: ['creditCard', 'cvv', 'password', 'token'],
    customExtractors: {
      userId: (req: any) => req.headers['x-user-id'],
      amount: (req: any) => req.body?.amount,
      currency: (req: any) => req.body?.currency,
    },
  }) as unknown as RequestHandler,
  exampleController.processPayment.bind(exampleController)
)

app.post(
  '/api/validate',
  transactionLogger('validate_data') as unknown as RequestHandler,
  exampleController.validateData.bind(exampleController)
)

app.get('/healthz', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'example-service',
  })
})

app.get('/api/logs', async (req: Request, res: Response) => {
  try {
    const { searchTerm, transactionId } = req.query

    const systemLogs = await getSystemLogger().getSystemLogs(
      searchTerm as string,
      transactionId as string
    )

    const transactionLogs = await getSystemLogger().getTransactionLogs(
      ['create_resource', 'process_payment', 'validate_data'],
      transactionId as string
    )

    res.json({
      systemLogs,
      transactionLogs,
      total: systemLogs.length + transactionLogs.length,
    })
  } catch (error) {
    await getSystemLogger().error(
      'Erro ao buscar logs',
      error as Error,
      { searchTerm: req.query.searchTerm },
      req.transactionId
    )

    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  getSystemLogger().error(
    'Erro não tratado na aplicação',
    error,
    {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    req.transactionId
  )

  res.status(500).json({
    error: 'Erro interno do servidor',
    transactionId: req.transactionId,
  })
})

async function startServer() {
  const loggingInitialized = await initializeLogging()

  if (!loggingInitialized) {
    console.error('❌ Não foi possível inicializar o sistema de logging')
    process.exit(1)
  }

  const PORT = process.env.PORT || 3000

  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`)
    console.log(`📊 Health check: http://localhost:${PORT}/healthz`)
    console.log(`🔍 Logs: http://localhost:${PORT}/api/logs`)
    console.log(`📝 API Resources: http://localhost:${PORT}/api/resources`)
    console.log(`💳 API Payments: http://localhost:${PORT}/api/payments`)
  })
}

startServer().catch((error) => {
  console.error('❌ Erro ao iniciar servidor:', error)
  process.exit(1)
})

export default app
