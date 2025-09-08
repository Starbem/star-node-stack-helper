/**
 * Basic logging system usage example
 *
 * This example demonstrates how to use the basic functionalities
 * of the logging system without specific frameworks
 */

import {
  LoggerFactory,
  getSystemLogger,
  PinoLogger,
  getPinoConfig,
  initializePinoLogger,
  logInfo,
  logBusinessEvent,
  logSecurityEvent,
  logPerformance,
} from '../src'

async function initializeLogging() {
  try {
    const config = {
      opensearch: {
        node: 'https://localhost:9200',
        username: 'admin',
        password: 'admin',
        region: 'us-east-1',
      },
      service: {
        name: 'example-service',
        environment: 'development',
        index: 'example-logs',
      },
      logging: {
        level: 'debug' as const,
        enableTransactionLogs: true,
        enableSystemLogs: true,
        sensitiveFields: ['password', 'token', 'secret'],
      },
    }

    const result = await LoggerFactory.initialize(config)

    if (!result.success) {
      console.error('❌ Falha ao inicializar logging:', result.error)
      return false
    }

    console.log('✅ Sistema de logging inicializado com sucesso')

    const pinoConfig = getPinoConfig('development')
    pinoConfig.service = 'example-service'
    pinoConfig.pretty = true
    const pinoLogger = initializePinoLogger(pinoConfig)

    console.log('✅ Pino logger também inicializado!')
    return true
  } catch (error) {
    console.error('❌ Erro ao inicializar logging:', error)
    return false
  }
}

function demonstratePinoLogger() {
  console.log('\n📝 Demonstrando Pino Logger...')

  const pinoLogger = new PinoLogger({
    level: 'debug',
    service: 'exemplo-pino',
    environment: 'development',
    pretty: true,
  })

  // Basic logs
  pinoLogger.info('Aplicação iniciada')
  pinoLogger.debug('Debug info', { userId: 123, action: 'login' })
  pinoLogger.warn('Aviso importante', { warning: 'Rate limit approaching' })
  pinoLogger.error('Erro simulado', new Error('Erro de exemplo'))

  // Business logs
  pinoLogger.business('user_registration', {
    userId: 456,
    email: 'user@example.com',
    plan: 'premium',
  })

  // Security logs
  pinoLogger.security('failed_login_attempt', {
    email: 'user@example.com',
    ip: '192.168.1.100',
    reason: 'invalid_password',
  })

  // Performance logs
  pinoLogger.performance('database_query', 150, {
    query: 'SELECT * FROM users',
    rowsReturned: 1000,
  })

  // Transaction logs
  const transactionId = 'txn_' + Date.now()
  pinoLogger.transaction(transactionId, 'order_creation', {
    userId: 456,
    total: 99.99,
  })

  // System logs
  pinoLogger.system('service_startup', {
    version: '1.0.0',
    port: 3000,
  })

  // Child logger with context
  const userLogger = pinoLogger.child({ userId: 789 })
  userLogger.info('Usuário logado')
  userLogger.business('profile_update', { fields: ['name', 'email'] })

  console.log('✅ Pino Logger demonstrado com sucesso!')
}

async function basicLoggingExamples() {
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Info log
  await logInfo(
    'Processando requisição de exemplo',
    {
      userId: 'user123',
      operation: 'example_operation',
    },
    transactionId
  )

  // Business event log
  await logBusinessEvent(
    'user_action',
    {
      action: 'view_dashboard',
      userId: 'user123',
      timestamp: new Date().toISOString(),
    },
    transactionId
  )

  // Performance log
  const startTime = Date.now()
  await new Promise((resolve) => setTimeout(resolve, 100)) // Simulate processing
  const duration = Date.now() - startTime

  await logPerformance(
    'example_operation',
    duration,
    {
      statusCode: 200,
    },
    transactionId
  )

  // Security event log
  await logSecurityEvent(
    'user_authentication_attempt',
    {
      userId: 'user123',
      action: 'login',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      timestamp: new Date().toISOString(),
    },
    transactionId
  )
}

async function advancedLoggingExamples() {
  const systemLogger = getSystemLogger()
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    // Log operation start
    await systemLogger.info(
      'Iniciando processamento de dados',
      {
        operation: 'data_processing',
        recordCount: 1000,
      },
      transactionId
    )

    // Simulate processing with progress logs
    for (let i = 0; i < 5; i++) {
      await systemLogger.info(
        `Processando lote ${i + 1}/5`,
        {
          batch: i + 1,
          total: 5,
          progress: ((i + 1) / 5) * 100,
        },
        transactionId
      )

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    // Success log
    await systemLogger.businessEvent(
      'data_processing_completed',
      {
        totalRecords: 1000,
        processedRecords: 1000,
        errors: 0,
        duration: 1000,
      },
      transactionId
    )
  } catch (error) {
    // Error log
    await systemLogger.error(
      'Erro durante processamento de dados',
      error as Error,
      {
        operation: 'data_processing',
        recordCount: 1000,
      },
      transactionId
    )
  }
}

async function searchLogsExamples() {
  const systemLogger = getSystemLogger()

  try {
    // Search system logs
    const systemLogs = await systemLogger.getSystemLogs([
      'user123',
      'data_processing',
    ])
    console.log('📊 Logs sistêmicos encontrados:', systemLogs.length)

    // Search transaction logs
    const transactionLogs = await systemLogger.getTransactionLogs([
      'data_processing',
    ])
    console.log('📊 Logs de transação encontrados:', transactionLogs.length)

    // Search by specific transaction ID
    const specificLogs = await systemLogger.getSystemLogs(
      'tx_1703123456789_abc123'
    )
    console.log('📊 Logs específicos encontrados:', specificLogs.length)
  } catch (error) {
    console.error('❌ Erro ao buscar logs:', error)
  }
}

async function healthCheckExamples() {
  try {
    // Check cluster health
    const isHealthy = await LoggerFactory.checkHealth()
    console.log('🏥 Cluster OpenSearch saudável:', isHealthy)

    // Check if logger was initialized
    const isInitialized = LoggerFactory.isLoggerInitialized()
    console.log('🔧 Logger inicializado:', isInitialized)
  } catch (error) {
    console.error('❌ Erro na verificação de saúde:', error)
  }
}

async function runExamples() {
  console.log('🚀 Iniciando exemplos de uso básico...')

  // Demonstrate Pino Logger first (no initialization needed)
  demonstratePinoLogger()

  // Initialize logging
  const initialized = await initializeLogging()
  if (!initialized) {
    console.error('❌ Não foi possível inicializar o sistema de logging')
    return
  }

  // Execute examples
  await basicLoggingExamples()
  await advancedLoggingExamples()
  await searchLogsExamples()
  await healthCheckExamples()

  console.log('✅ Todos os exemplos executados com sucesso!')
}

// Execute examples if this file is run directly
if (require.main === module) {
  runExamples().catch((error) => {
    console.error('❌ Erro ao executar exemplos:', error)
    process.exit(1)
  })
}

export {
  initializeLogging,
  basicLoggingExamples,
  advancedLoggingExamples,
  searchLogsExamples,
  healthCheckExamples,
  runExamples,
}
