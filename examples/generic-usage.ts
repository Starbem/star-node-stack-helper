/**
 * Generic usage example of the logging system
 *
 * This example demonstrates how to use the logging system
 * in a generic way, without relying on specific cases
 */

import {
  initializeLogger,
  transactionLogger,
  addTransactionId,
  getSystemLogger,
  LoggedApiOperation,
  LoggedBusinessOperation,
  LoggedSecurityOperation,
} from '../src'

async function initializeGenericLogging() {
  try {
    const result = await initializeLogger('generic-service', 'development')

    if (!result.success) {
      console.error('❌ Falha ao inicializar logging:', result.error)
      return false
    }

    console.log('✅ Sistema de logging genérico inicializado com sucesso')
    return true
  } catch (error) {
    console.error('❌ Erro ao inicializar logging:', error)
    return false
  }
}

export function createGenericTransactionLogger(operationName: string) {
  return transactionLogger(operationName, {
    sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'authorization'],

    customExtractors: {
      userId: (req: any) => req.headers['x-user-id'] || req.headers['user-id'],

      tenantId: (req: any) =>
        req.headers['x-tenant-id'] || req.headers['tenant-id'],

      apiVersion: (req: any) => req.headers['x-api-version'] || 'v1',

      resourceId: (req: any) => req.params?.id || req.params?.resourceId,
    },

    customFields: {
      service: 'generic-service',
      environment: 'development',
    },
  })
}

class GenericController {
  // @ts-ignore - Decorator signature issue with TypeScript strict mode
  @LoggedApiOperation('create_resource', {
    logRequest: true,
    logPerformance: true,
    logBusinessEvent: true,
    businessEventName: 'resource_created',
    sensitiveFields: ['password', 'token', 'secret'],
  })
  async createResource(req: any, res: any) {
    const { name, description } = req.body
    const transactionId = req.transactionId

    await getSystemLogger().businessEvent(
      'resource_creation_started',
      {
        resourceName: name,
        hasDescription: !!description,
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

      res.json(resource)
    } catch (error) {
      await getSystemLogger().error(
        'Erro ao criar recurso',
        error as Error,
        { resourceName: name },
        transactionId
      )

      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }

  // @ts-ignore - Decorator signature issue with TypeScript strict mode
  @LoggedBusinessOperation('process_payment', 'payment_processed')
  async processPayment(req: any, res: any) {
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
  @LoggedSecurityOperation('user_authentication')
  async authenticateUser(req: any, res: any) {
    const { username, password } = req.body
    const transactionId = req.transactionId

    await getSystemLogger().securityEvent(
      'authentication_attempt',
      {
        username,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      },
      transactionId
    )

    const isAuthenticated = username && password

    if (isAuthenticated) {
      res.json({
        success: true,
        token: `token_${Date.now()}`,
        expiresIn: 3600,
      })
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' })
    }
  }
}

export function setupGenericExpressApp() {
  const express = require('express')
  const app = express()

  app.use(express.json())
  app.use(addTransactionId)

  const controller = new GenericController()

  app.post(
    '/api/resources',
    createGenericTransactionLogger('create_resource'),
    controller.createResource.bind(controller)
  )

  app.post(
    '/api/payments',
    createGenericTransactionLogger('process_payment'),
    controller.processPayment.bind(controller)
  )

  app.post(
    '/api/auth',
    createGenericTransactionLogger('user_authentication'),
    controller.authenticateUser.bind(controller)
  )

  app.get('/api/health', (req: any, res: any) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'generic-service',
      transactionId: req.transactionId,
    })
  })

  return app
}

async function genericLoggingExamples() {
  const systemLogger = getSystemLogger()
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  await systemLogger.info(
    'Operação genérica iniciada',
    {
      operation: 'generic_operation',
      timestamp: new Date().toISOString(),
    },
    transactionId
  )

  await systemLogger.businessEvent(
    'generic_business_event',
    {
      eventType: 'user_action',
      action: 'data_export',
      recordCount: 1000,
      format: 'csv',
    },
    transactionId
  )

  await systemLogger.securityEvent(
    'generic_security_event',
    {
      eventType: 'access_attempt',
      resource: '/api/sensitive-data',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
    },
    transactionId
  )

  const startTime = Date.now()
  await new Promise((resolve) => setTimeout(resolve, 100))
  const duration = Date.now() - startTime

  await systemLogger.performance(
    'generic_operation',
    duration,
    {
      operation: 'data_processing',
      recordCount: 1000,
    },
    transactionId
  )
}

export function createCustomTransactionLogger(
  operationName: string,
  domainConfig: {
    sensitiveFields?: string[]
    customExtractors?: Record<string, (req: any, res: any) => any>
    businessEventName?: string
  }
) {
  return transactionLogger(operationName, {
    sensitiveFields: domainConfig.sensitiveFields || [
      'password',
      'token',
      'secret',
      'apiKey',
      'authorization',
      'creditCard',
      'ssn',
      'privateKey',
    ],
    customExtractors: domainConfig.customExtractors,
    customFields: {
      businessEventName: domainConfig.businessEventName,
      domain: 'custom-domain',
    },
  })
}

async function runGenericExamples() {
  console.log('🚀 Iniciando exemplos genéricos...')

  const initialized = await initializeGenericLogging()
  if (!initialized) {
    console.error('❌ Não foi possível inicializar o sistema de logging')
    return
  }

  await genericLoggingExamples()

  console.log('✅ Todos os exemplos genéricos executados com sucesso!')
  console.log(
    '📝 Use setupGenericExpressApp() para configurar uma aplicação Express genérica'
  )
}

if (require.main === module) {
  runGenericExamples().catch((error) => {
    console.error('❌ Erro ao executar exemplos genéricos:', error)
    process.exit(1)
  })
}

export {
  initializeGenericLogging,
  GenericController,
  genericLoggingExamples,
  runGenericExamples,
}
