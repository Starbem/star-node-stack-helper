import * as express from 'express'
import { ElasticLogger, LoggerConfig } from '../src'

const config = {
  service: 'star-node-stack-helper-example',
  environment: 'dev',
  username: 'admin',
  password: 'Teste@2025',
  node: 'http://localhost:9200',
}

const loggerConfig: LoggerConfig = {
  ...config,
  index: 'system-logs',
}

const logger = new ElasticLogger(loggerConfig)

const app = express()

app.get('/system-logs/add', (req, res) => {
  const body = {
    message: 'Log example',
    level: 'error',
    id: '123',
    timestamp: new Date().toISOString(),
  }

  res.json({
    message: 'Log saved successfully',
    body,
  })
})

app.get('/logs-transactions/add', (req, res) => {
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

  logger.logTransaction(body)

  res.json({
    message: 'Log transaction saved successfully',
    body,
  })
})

app.get('/system-logs', async (req, res) => {
  const logs = await logger.getSystemLogs('Log example')
  res.json({
    message: 'Logs fetched successfully',
    logs,
  })
})

app.get('/logs-transactions', async (req, res) => {
  const transactions = await logger.getLogsTransactions('Transaction example')
  res.json({
    message: 'Transactions fetched successfully',
    transactions,
  })
})

app.listen(3000, () => {
  console.log('Server is running on port 3000')
})
