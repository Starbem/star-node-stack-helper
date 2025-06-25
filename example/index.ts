import * as express from 'express'
import {
  ElasticLogger,
  LoggerConfig,
  loadSecrets,
  testSavedSecrets,
} from '../src'

const loggerConfig: LoggerConfig = {
  service: 'star-node-stack-helper-example',
  environment: 'dev',
  username: 'admin',
  password: 'Teste@2025',
  node: 'http://localhost:9200',
  index: 'system-logs',
  region: 'us-east-2',
}

// TODO: Add logger config example
const logger = new ElasticLogger(loggerConfig)

const app = express()

// TODO: Add system logs example
app.get('/system-logs/add', async (req, res) => {
  const level = 'info'
  const message = 'Log example message'
  const body = {
    id: '123',
    timestamp: new Date().toISOString(),
  }

  await logger.log(level, message, body)

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
app.get('/logs-transactions/add', async (req, res) => {
  const body = {
    service: 'accounts-ms',
    name: 'Transaction example',
    status: 'success' as const,
    duration: 1000,
    context: {
      message: 'Log example',
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
      path: '/logs-transactions/add',
      ip: '127.0.0.1',
    },
  }

  await logger.logTransaction(body)

  res.json({
    message: 'Log transaction saved successfully',
    body,
  })
})

// TODO: search system logs example
app.get('/system-logs', async (req, res) => {
  const logs = await logger.getSystemLogs('Log example')
  res.json({
    message: 'Logs fetched successfully',
    logs,
  })
})

// TODO: search logs transactions example
app.get('/logs-transactions', async (req, res) => {
  const transactions = await logger.getLogsTransactions('Transaction example')
  res.json({
    message: 'Transactions fetched successfully',
    transactions,
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
