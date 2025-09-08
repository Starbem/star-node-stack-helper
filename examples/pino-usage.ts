/**
 * Pino Logger usage example
 *
 * This example demonstrates how to use PinoLogger for local logs,
 * development and fallback when OpenSearch is not available.
 */

import {
  PinoLogger,
  initializePinoLogger,
  getPinoConfig,
  getPinoLogger,
} from '../src/core/pino-logger'

console.log('=== Exemplo 1: Inicialização Básica ===')

const pinoLogger = new PinoLogger({
  level: 'debug',
  service: 'exemplo-servico',
  environment: 'development',
  pretty: true,
})

pinoLogger.info('Logger inicializado com sucesso')
pinoLogger.debug('Mensagem de debug', { userId: 123, action: 'login' })
pinoLogger.warn('Aviso importante', { warning: 'Rate limit approaching' })
pinoLogger.error('Erro simulado', new Error('Erro de exemplo'))

console.log('\n=== Exemplo 2: Logs de Negócio ===')

pinoLogger.business('user_registration', {
  userId: 456,
  email: 'user@example.com',
  plan: 'premium',
  source: 'web',
})

pinoLogger.business('payment_processed', {
  userId: 456,
  amount: 99.99,
  currency: 'BRL',
  paymentMethod: 'credit_card',
  transactionId: 'txn_123456',
})

console.log('\n=== Exemplo 3: Logs de Segurança ===')

pinoLogger.security('failed_login_attempt', {
  email: 'user@example.com',
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  reason: 'invalid_password',
})

pinoLogger.security('suspicious_activity', {
  userId: 456,
  activity: 'multiple_failed_logins',
  ip: '192.168.1.100',
  timestamp: new Date().toISOString(),
})

console.log('\n=== Exemplo 4: Logs de Performance ===')

const startTime = Date.now()
setTimeout(() => {
  const duration = Date.now() - startTime
  pinoLogger.performance('database_query', duration, {
    query: 'SELECT * FROM users WHERE active = true',
    rowsReturned: 1500,
    database: 'users_db',
  })
}, 100)

console.log('\n=== Exemplo 5: Logs de Transação ===')

const transactionId = 'txn_' + Date.now()
pinoLogger.transaction(transactionId, 'order_creation', {
  userId: 456,
  items: [
    { productId: 'prod_1', quantity: 2, price: 29.99 },
    { productId: 'prod_2', quantity: 1, price: 39.99 },
  ],
  total: 99.97,
})

pinoLogger.transaction(transactionId, 'payment_processing', {
  paymentMethod: 'credit_card',
  amount: 99.97,
  status: 'processing',
})

console.log('\n=== Exemplo 6: Logs de Sistema ===')

pinoLogger.system('service_startup', {
  version: '1.0.0',
  port: 3000,
  environment: 'development',
  features: ['auth', 'payments', 'notifications'],
})

pinoLogger.system('health_check', {
  status: 'healthy',
  uptime: process.uptime(),
  memoryUsage: process.memoryUsage(),
  cpuUsage: process.cpuUsage(),
})

console.log('\n=== Exemplo 7: Child Logger ===')

const userLogger = pinoLogger.child({ userId: 789, sessionId: 'sess_123' })
userLogger.info('Usuário logado')
userLogger.business('profile_update', {
  fields: ['name', 'email'],
  previousValues: { name: 'João', email: 'joao@old.com' },
  newValues: { name: 'João Silva', email: 'joao.silva@new.com' },
})

console.log('\n=== Exemplo 8: Logger Global ===')

const globalConfig = getPinoConfig('development')
globalConfig.service = 'exemplo-global'
initializePinoLogger(globalConfig)

const globalLogger = getPinoLogger()
globalLogger.info('Usando logger global')
globalLogger.business('global_event', { event: 'system_initialized' })

console.log('\n=== Exemplo 9: Configuração por Ambiente ===')

const devConfig = getPinoConfig('development')
console.log('Configuração de desenvolvimento:', devConfig)

const prodConfig = getPinoConfig('production')
console.log('Configuração de produção:', prodConfig)

console.log('\n=== Exemplo 10: Verificação de Níveis ===')

console.log('Debug habilitado:', pinoLogger.isLevelEnabled('debug'))
console.log('Info habilitado:', pinoLogger.isLevelEnabled('info'))
console.log('Warn habilitado:', pinoLogger.isLevelEnabled('warn'))
console.log('Error habilitado:', pinoLogger.isLevelEnabled('error'))

pinoLogger.setLevel('warn')
console.log('Nível alterado para warn')
console.log('Debug ainda habilitado:', pinoLogger.isLevelEnabled('debug'))
console.log('Warn ainda habilitado:', pinoLogger.isLevelEnabled('warn'))

console.log('\n=== Exemplo 11: Redação de Dados Sensíveis ===')

pinoLogger.info('Dados com informações sensíveis', {
  userId: 123,
  email: 'user@example.com',
  password: 'senha123',
  token: 'abc123xyz',
  creditCard: '4111-1111-1111-1111',
  normalData: 'dados normais',
})

console.log('\n=== Exemplo 12: Logs com Erro Detalhado ===')

try {
  throw new Error('Erro simulado para demonstração')
} catch (error) {
  pinoLogger.error('Erro capturado com stack trace', error as Error)
}

console.log('\n=== Exemplo 13: Logs Estruturados ===')

const metrics = {
  responseTime: 150,
  statusCode: 200,
  endpoint: '/api/users',
  method: 'GET',
  userAgent: 'Mozilla/5.0...',
  ip: '192.168.1.100',
}

pinoLogger.info('Request processada', {
  ...metrics,
  type: 'api_request',
  success: true,
})

console.log('\n=== Exemplo 14: Logs de Auditoria ===')

pinoLogger.security('audit_log', {
  action: 'data_export',
  userId: 456,
  resource: 'user_data',
  timestamp: new Date().toISOString(),
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
  result: 'success',
  recordsExported: 1000,
})

console.log('\n=== Exemplos Concluídos ===')
console.log('Todos os exemplos de uso do PinoLogger foram executados!')
console.log('Verifique os logs acima para ver a saída formatada.')
