# Star Node Stack Helper

A comprehensive helper library for Node.js applications that provides enterprise-grade utilities for AWS Secrets Manager integration, Elasticsearch/OpenSearch logging, Slack notifications, Express.js middleware, and NestJS integration with advanced features.

## 🚀 Features

- **AWS Secrets Manager Integration**: Secure secret loading with retry logic and IAM role support
- **Elasticsearch/OpenSearch Logging**: Enterprise-grade logging with transaction tracking
- **Pino Logger Integration**: High-performance structured logging
- **Slack Notifications**: Complete Slack integration with API and webhook support, enhanced block validation, and automatic error handling
- **NestJS Compatibility**: Native integration with decorators, interceptors, guards, and exception filters
- **Express Middleware**: Performance monitoring and transaction logging
- **TypeScript Support**: Full type safety and IntelliSense support
- **AWS IAM Integration**: Seamless authentication with AWS services

## 📦 Installation

```bash
npm install @starbemtech/star-node-stack-helper
# or
pnpm add @starbemtech/star-node-stack-helper
# or
yarn add @starbemtech/star-node-stack-helper
```

## 🔧 Requirements

- Node.js >= 18
- TypeScript (optional but recommended)

## 📚 Table of Contents

- [AWS Secrets Manager](#aws-secrets-manager)
- [Elasticsearch/OpenSearch Logging](#elasticsearchopensearch-logging)
- [Pino Logger](#pino-logger)
- [Slack Notifications](#slack-notifications)
- [NestJS Compatibility](#nestjs-compatibility)
- [Express Middleware](#express-middleware)
- [TypeScript Types](#typescript-types)
- [Examples](#examples)
- [API Reference](#api-reference)

## 🔐 AWS Secrets Manager

### Basic Usage

```typescript
import {
  loadSecrets,
  testSavedSecrets,
  isRunningOnAWS,
  getAWSRegion,
} from '@starbemtech/star-node-stack-helper'

// Load secrets from AWS Secrets Manager
const secrets = await loadSecrets({
  region: 'us-east-1',
  secretName: ['prod/database/credentials', 'prod/api/keys'],
})

// Test if secrets were loaded correctly
testSavedSecrets()

// Check if running on AWS
const isAWS = isRunningOnAWS() // true if running on AWS Lambda or EC2

// Get AWS region
const region = getAWSRegion() // 'us-east-1' or undefined
```

### Advanced Configuration

```typescript
import {
  loadSecrets,
  SecretConfig,
  RetryConfig,
} from '@starbemtech/star-node-stack-helper'

const retryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
}

const secretConfig: SecretConfig = {
  region: 'us-east-1',
  secretName: ['prod/database/credentials'],
  retry: retryConfig,
  credentials: {
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key',
  },
}

const secrets = await loadSecrets(secretConfig)
```

### Environment Variables

After loading secrets, they are automatically set as environment variables:

```typescript
// If secret contains: { "DB_HOST": "localhost", "DB_PORT": "5432" }
// These become available as:
console.log(process.env.DB_HOST) // 'localhost'
console.log(process.env.DB_PORT) // '5432'
```

## 📊 Elasticsearch/OpenSearch Logging

### Basic Setup

```typescript
import {
  ElasticLogger,
  LoggerConfig,
} from '@starbemtech/star-node-stack-helper'

const config: LoggerConfig = {
  node: 'https://your-opensearch-cluster.us-east-1.es.amazonaws.com',
  service: 'my-service',
  environment: 'production',
  index: 'application-logs',
  region: 'us-east-1',
  authType: 'aws', // or 'basic' with username/password
}

const logger = new ElasticLogger(config)
```

### Logging Messages

```typescript
// Basic logging
await logger.log('info', 'User logged in successfully', {
  userId: '123',
  sessionId: 'sess_456',
  ip: '192.168.1.1',
})

// Different log levels
await logger.log('debug', 'Debug information', { step: 'validation' })
await logger.log('warn', 'Warning message', { threshold: 80 })
await logger.log('error', 'Error occurred', {
  error: 'Database connection failed',
})
```

### Transaction Logging

```typescript
import { LogTransaction } from '@starbemtech/star-node-stack-helper'

const transaction: LogTransaction = {
  name: 'user-registration',
  microservice: 'auth-service',
  operation: 'create-user',
  status: 'success',
  duration: 1500,
  context: {
    userId: '123',
    email: 'user@example.com',
    plan: 'premium',
  },
  requestMeta: {
    method: 'POST',
    path: '/api/users',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
  },
}

await logger.logTransaction(transaction)
```

### Searching Logs

```typescript
// Search system logs
const systemLogs = await logger.getSystemLogs('user login')

// Search transaction logs
const transactionLogs = await logger.getLogsTransactions('user-registration')

// Multiple queries
const logs = await logger.getSystemLogs(['error', 'database', 'timeout'])
```

### Health Check and Maintenance

```typescript
// Check cluster health
const isHealthy = await logger.healthCheck()

// Test connection
await logger.testConnection()

// Flush indices
await logger.flush()

// Recreate index (useful for schema changes)
await logger.recreateIndex()
```

## 🎯 Pino Logger

### Basic Setup

```typescript
import {
  createPinoLogger,
  createHttpLogger,
  pinoLogContext,
} from '@starbemtech/star-node-stack-helper'

const logger = createPinoLogger({
  serviceName: 'my-service',
  environment: 'production',
  logLevel: 'info',
})

// Create HTTP middleware
const httpLogger = createHttpLogger(logger)
```

### Express Integration

```typescript
import express from 'express'

const app = express()

// Add HTTP logging middleware
app.use(httpLogger)

app.get('/api/users', (req, res) => {
  // Logs are automatically captured
  res.json({ users: [] })
})
```

### Structured Logging

```typescript
// Basic structured logging
logger.info('User action completed', {
  userId: '123',
  action: 'profile_update',
  timestamp: new Date().toISOString(),
})

// Using context helpers
const requestContext = pinoLogContext.request(req, {
  userId: '456',
  sessionId: 'sess_789',
})

logger.info('User performed action', {
  ...requestContext,
  action: 'file_upload',
  fileSize: 1024,
  fileName: 'document.pdf',
})

// Performance logging
const startTime = Date.now()
// ... perform operation
const duration = Date.now() - startTime

const performanceContext = pinoLogContext.performance('file_upload', duration, {
  fileSize: 1024,
  fileName: 'document.pdf',
})

logger.info('Operation completed', {
  ...requestContext,
  ...performanceContext,
  success: true,
})

// Proxy/API Gateway logging
const proxyContext = pinoLogContext.proxy(
  'https://api.example.com',
  'user-service',
  {
    method: 'GET',
    endpoint: '/users/123',
    responseTime: 150,
  }
)

logger.info('API Gateway request', proxyContext)

// Error logging
try {
  // ... risky operation
} catch (error) {
  const errorContext = pinoLogContext.error(error, {
    operation: 'file_upload',
    retryable: true,
  })

  logger.error('Operation failed', {
    ...requestContext,
    ...errorContext,
    severity: 'high',
  })
}
```

### Custom Configuration

```typescript
const logger = createPinoLogger({
  serviceName: 'my-service',
  environment: 'production',
  logLevel: 'debug',
  customFormatters: {
    level: (label) => ({ level: label.toUpperCase() }),
    log: (object) => ({ ...object, custom: true }),
  },
  customSerializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
    err: (err) => ({ message: err.message, stack: err.stack }),
  },
  redactPaths: ['password', 'token', 'secret'],
})
```

## 💬 Slack Notifications

The library provides comprehensive Slack integration with support for both the official Slack API and webhooks, including formatted messages, interactive buttons, and attachments. **Now with enhanced block validation and error handling to prevent "invalid_blocks" errors.**

### Basic Setup

#### Using Slack API (Recommended)

```typescript
import {
  sendSlackMessage,
  SlackNotifier,
  createSectionBlock,
  createButtonElement,
  createActionBlock,
} from '@starbemtech/star-node-stack-helper'

// Simple message
const response = await sendSlackMessage(
  {
    channel: '#general',
    text: 'Hello! This is a test notification.',
    username: 'My Bot',
    icon_emoji: ':robot_face:',
  },
  {
    config: {
      token: 'xoxb-your-bot-token-here',
      defaultChannel: '#general',
      botName: 'My Bot',
    },
    failSilently: true,
  }
)

console.log('Message sent:', response.ok)
```

#### Using Slack Webhook

```typescript
import { sendSlackWebhook } from '@starbemtech/star-node-stack-helper'

const response = await sendSlackWebhook(
  {
    text: 'Hello via webhook!',
    channel: '#general',
    username: 'Webhook Bot',
  },
  {
    webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
    defaultChannel: '#general',
    botName: 'Webhook Bot',
  }
)
```

### Using SlackNotifier Class

The `SlackNotifier` class provides a convenient way to manage Slack notifications:

```typescript
import { SlackNotifier } from '@starbemtech/star-node-stack-helper'

const notifier = new SlackNotifier(
  {
    token: 'xoxb-your-bot-token-here',
    defaultChannel: '#notifications',
    botName: 'System Notifications',
  },
  {
    failSilently: true,
    retryConfig: {
      maxAttempts: 5,
      delayMs: 2000,
    },
  }
)

// Send different types of messages
await notifier.sendMessage('Simple message')
await notifier.sendSuccess('Operation completed successfully!')
await notifier.sendWarning('Attention: Low resources detected')
await notifier.sendError('Critical error: Database connection failed')
```

### Formatted Messages with Blocks

```typescript
import {
  sendSlackMessage,
  createSectionBlock,
  createDividerBlock,
  createButtonElement,
  createActionBlock,
} from '@starbemtech/star-node-stack-helper'

const blocks = [
  createSectionBlock('*🚀 New Deploy Completed!*', { type: 'mrkdwn' }),
  createDividerBlock(), // Use divider instead of empty section blocks
  createSectionBlock('Deployment Details', {
    fields: [
      { type: 'mrkdwn', text: '*Environment:*' },
      { type: 'mrkdwn', text: 'Production' },
      { type: 'mrkdwn', text: '*Version:*' },
      { type: 'mrkdwn', text: 'v1.2.3' },
      { type: 'mrkdwn', text: '*Status:*' },
      { type: 'mrkdwn', text: '✅ Success' },
    ],
  }),
  createActionBlock([
    createButtonElement('View Logs', 'view_logs', {
      style: 'primary',
      action_id: 'view_logs_btn',
    }),
    createButtonElement('Rollback', 'rollback', {
      style: 'danger',
      action_id: 'rollback_btn',
    }),
  ]),
]

const response = await sendSlackMessage(
  {
    channel: '#deployments',
    text: 'New deploy completed successfully!',
    blocks,
  },
  {
    config: {
      token: 'xoxb-your-bot-token-here',
    },
  }
)
```

### Enhanced Block Validation

The library now includes automatic block validation and sanitization to prevent "invalid_blocks" errors:

```typescript
import {
  SlackNotifier,
  createSectionBlock,
} from '@starbemtech/star-node-stack-helper'

const notifier = new SlackNotifier({
  token: 'xoxb-your-bot-token-here',
  defaultChannel: '#notifications',
})

// The sendFormattedMessage method now automatically:
// 1. Validates block structure
// 2. Sanitizes text content (removes control characters, escapes special chars)
// 3. Truncates text that exceeds Slack's 3000 character limit
// 4. Filters out invalid blocks
// 5. Falls back to simple text message if all blocks are invalid

await notifier.sendFormattedMessage([
  createSectionBlock('*System Status*', { type: 'mrkdwn' }),
  createSectionBlock('✅ All systems operational'), // Text is automatically sanitized
  createSectionBlock(''), // Empty blocks are automatically handled
])
```

#### Block Validation Features

- **Text Sanitization**: Automatically removes control characters and escapes special characters for mrkdwn
- **Length Validation**: Truncates text that exceeds Slack's 3000 character limit
- **Structure Validation**: Ensures blocks have required properties and valid types
- **Empty Block Handling**: Replaces empty section blocks with proper dividers
- **Error Recovery**: Falls back to simple text messages if all blocks are invalid
- **Detailed Logging**: Warns about filtered blocks for debugging

### Attachments

```typescript
import { createSlackAttachment } from '@starbemtech/star-node-stack-helper'

const attachment = createSlackAttachment({
  color: 'danger',
  title: '🚨 System Alert',
  text: 'The system detected a critical issue that requires immediate attention.',
  fields: [
    { title: 'Service', value: 'API Gateway', short: true },
    { title: 'Error', value: 'Connection timeout', short: true },
    { title: 'Timestamp', value: new Date().toISOString(), short: false },
  ],
  ts: Math.floor(Date.now() / 1000),
})

const response = await sendSlackMessage(
  {
    channel: '#alerts',
    text: 'Critical system alert',
    attachments: [attachment],
  },
  {
    config: {
      token: 'xoxb-your-bot-token-here',
    },
  }
)
```

### Error Handling and Retry

```typescript
import { sendSlackMessage } from '@starbemtech/star-node-stack-helper'

try {
  const response = await sendSlackMessage(
    {
      channel: '#errors',
      text: 'This message will be retried multiple times on failure',
    },
    {
      config: {
        token: 'xoxb-your-bot-token-here',
      },
      retryConfig: {
        maxAttempts: 3,
        delayMs: 1000,
      },
      failSilently: false, // Will throw error if it fails
    }
  )

  console.log('Message sent successfully:', response)
} catch (error) {
  console.error('Failed to send message after all attempts:', error)
}
```

### Troubleshooting Common Issues

#### "invalid_blocks" Error

If you encounter the "invalid_blocks" error, the library now automatically handles most common causes:

```typescript
// ❌ Problematic code (now automatically fixed)
const blocks = [
  createSectionBlock(''), // Empty blocks are now handled
  createSectionBlock('Very long text...'), // Text is automatically truncated
  createSectionBlock('Text with special chars <>&'), // Characters are escaped
]

// ✅ Recommended approach
const blocks = [
  createSectionBlock('*Title*', { type: 'mrkdwn' }),
  createDividerBlock(), // Use dividers for separation
  createSectionBlock('Content with proper formatting'),
]
```

#### Channel Membership Check

The library now includes an optional channel membership check to verify if the bot is in the channel before sending messages:

```typescript
// Enable channel membership check (disabled by default)
await sendSlackMessage(
  {
    channel: '#general',
    text: 'Hello!',
  },
  {
    config: {
      token: 'xoxb-your-token',
    },
    checkChannelMembership: true, // Enable channel check
    failSilently: true,
  }
)

// Disable channel membership check (default behavior)
await sendSlackMessage(
  {
    channel: '#general',
    text: 'Hello!',
  },
  {
    config: {
      token: 'xoxb-your-token',
    },
    checkChannelMembership: false, // Disable channel check (default)
  }
)
```

**Note:** The `SlackNotifier` class has channel membership check disabled by default for better performance and to avoid unnecessary API calls.

#### Best Practices

1. **Use `createDividerBlock()` instead of empty section blocks**
2. **Keep text content under 3000 characters** (automatically handled)
3. **Use proper mrkdwn formatting** for rich text
4. **Handle errors gracefully** with `failSilently: true`
5. **Disable channel membership check** if you're sure the bot is in the channel

```typescript
const notifier = new SlackNotifier(
  {
    token: 'xoxb-your-token',
    defaultChannel: '#notifications',
  },
  {
    failSilently: true, // Prevents crashes on Slack API errors
    retryConfig: {
      maxAttempts: 3,
      delayMs: 1000,
    },
  }
)
```

### Configuration

#### Slack API Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or select an existing one
3. Navigate to "OAuth & Permissions"
4. Add the following scopes:
   - `chat:write` - Send messages
   - `chat:write.public` - Send messages to public channels
   - `chat:write.customize` - Customize bot name and icon
5. Install the app to your workspace
6. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

#### Webhook Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or select an existing one
3. Navigate to "Incoming Webhooks"
4. Activate "Activate Incoming Webhooks"
5. Click "Add New Webhook to Workspace"
6. Select the channel and copy the webhook URL

## 🚀 NestJS Compatibility

A biblioteca é totalmente compatível com NestJS, oferecendo decorators, interceptors, guards e exception filters para integração nativa com o framework.

### Instalação para NestJS

```bash
npm install @starbemtech/star-node-stack-helper @nestjs/common @nestjs/core rxjs
# ou
pnpm add @starbemtech/star-node-stack-helper @nestjs/common @nestjs/core rxjs
```

### Configuração Básica

```typescript
import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core'
import {
  ElasticLogger,
  LoggerConfig,
  TransactionLogInterceptor,
  LogExceptionFilter,
} from '@starbemtech/star-node-stack-helper'

const elasticConfig: LoggerConfig = {
  node: 'https://your-opensearch-endpoint.com',
  service: 'my-service',
  environment: 'development',
  index: 'transaction-logs',
  region: 'us-east-1',
  authType: 'aws',
}

const elasticLogger = new ElasticLogger(elasticConfig)

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useValue: new TransactionLogInterceptor({
        microservice: 'my-service',
        operation: 'api-request',
        elasticLogger,
      }),
    },
    {
      provide: APP_FILTER,
      useClass: LogExceptionFilter,
    },
  ],
})
export class AppModule {}
```

### Decorators de Logging

#### @Log - Logging Básico

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common'
import {
  Log,
  LogPerformance,
  LogError,
  LogCritical,
} from '@starbemtech/star-node-stack-helper'

@Controller('users')
export class UsersController {
  @Get()
  @Log('info', 'Fetching all users')
  async getUsers() {
    return [{ id: 1, name: 'João' }]
  }

  @Post()
  @LogPerformance('user-creation')
  async createUser(@Body() userData: any) {
    // Operação que será medida automaticamente
    return { id: 1, ...userData }
  }

  @Get('error')
  @LogError('Failed to fetch user')
  async getUserWithError() {
    throw new Error('User not found')
  }

  @Get('critical')
  @LogCritical('Critical system failure')
  async criticalOperation() {
    // Operação crítica que será logada com nível crítico
    return { status: 'critical' }
  }
}
```

#### @TransactionLog - Logging de Transações

```typescript
import { Controller, Post, Body } from '@nestjs/common'
import { TransactionLog } from '@starbemtech/star-node-stack-helper'

@Controller('transactions')
export class TransactionController {
  @Post('payment')
  @TransactionLog({
    microservice: 'payment-service',
    operation: 'process-payment',
    elasticLogger,
  })
  async processPayment(@Body() paymentData: any) {
    // Transação será automaticamente logada
    return { transactionId: 'tx_123', status: 'success' }
  }
}
```

### Interceptors

#### TransactionLogInterceptor - Interceptor Manual

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common'
import { TransactionLogInterceptor } from '@starbemtech/star-node-stack-helper'

@Controller('api')
@UseInterceptors(
  new TransactionLogInterceptor({
    microservice: 'my-service',
    operation: 'api-request',
    elasticLogger,
  })
)
export class ApiController {
  @Get('users')
  async getUsers() {
    return [{ id: 1, name: 'João' }]
  }
}
```

#### AutoTransactionLogInterceptor - Interceptor Automático

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common'
import {
  AutoTransactionLogInterceptor,
  TransactionLog,
} from '@starbemtech/star-node-stack-helper'

@Controller('api')
@UseInterceptors(
  new AutoTransactionLogInterceptor({
    elasticLogger,
    defaultMicroservice: 'my-service',
  })
)
export class ApiController {
  @Get('users')
  @TransactionLog({
    operation: 'get-users',
    microservice: 'user-service',
  })
  async getUsers() {
    return [{ id: 1, name: 'João' }]
  }
}
```

### Guards

#### LogGuard - Guard de Autenticação com Logging

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common'
import { LogGuard } from '@starbemtech/star-node-stack-helper'

@Controller('protected')
@UseGuards(
  new LogGuard({
    elasticLogger,
    logLevel: 'info',
  })
)
export class ProtectedController {
  @Get('data')
  async getProtectedData() {
    return { data: 'sensitive information' }
  }
}
```

### Exception Filters

#### LogExceptionFilter - Filtro de Exceções

```typescript
import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { LogExceptionFilter } from '@starbemtech/star-node-stack-helper'

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: LogExceptionFilter,
    },
  ],
})
export class AppModule {}
```

### Exemplo Completo NestJS

```typescript
import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
} from '@nestjs/common'
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core'
import {
  ElasticLogger,
  LoggerConfig,
  TransactionLogInterceptor,
  LogExceptionFilter,
  TransactionLog,
  Log,
} from '@starbemtech/star-node-stack-helper'

// Configuração
const elasticConfig: LoggerConfig = {
  node: 'https://your-opensearch-endpoint.com',
  service: 'my-nestjs-app',
  environment: 'production',
  index: 'nestjs-logs',
  region: 'us-east-1',
  authType: 'aws',
}

const elasticLogger = new ElasticLogger(elasticConfig)

// Controller
@Controller('api')
@UseInterceptors(
  new TransactionLogInterceptor({
    microservice: 'api-service',
    operation: 'api-request',
    elasticLogger,
  })
)
export class ApiController {
  @Get('users')
  @Log('info', 'Fetching users list')
  async getUsers() {
    return [
      { id: 1, name: 'João' },
      { id: 2, name: 'Maria' },
    ]
  }

  @Post('users')
  @TransactionLog({
    microservice: 'user-service',
    operation: 'create-user',
    elasticLogger,
  })
  async createUser(@Body() userData: any) {
    return {
      id: Math.floor(Math.random() * 1000),
      ...userData,
      createdAt: new Date().toISOString(),
    }
  }
}

// Módulo Principal
@Module({
  controllers: [ApiController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useValue: new TransactionLogInterceptor({
        microservice: 'my-nestjs-app',
        operation: 'global-request',
        elasticLogger,
      }),
    },
    {
      provide: APP_FILTER,
      useClass: LogExceptionFilter,
    },
  ],
})
export class AppModule {}
```

### Configuração Avançada

#### Interceptor com Contexto Customizado

```typescript
import { TransactionLogInterceptor } from '@starbemtech/star-node-stack-helper'

const customInterceptor = new TransactionLogInterceptor({
  microservice: 'my-service',
  operation: 'api-request',
  elasticLogger,
  customContext: (context) => ({
    userId: context.switchToHttp().getRequest().user?.id,
    sessionId: context.switchToHttp().getRequest().sessionId,
    customField: 'custom-value',
  }),
})
```

#### Exception Filter com Configuração Customizada

```typescript
import { LogExceptionFilter } from '@starbemtech/star-node-stack-helper'

const customExceptionFilter = new LogExceptionFilter({
  elasticLogger,
  logLevel: 'error',
  customContext: (host) => ({
    requestId: host.switchToHttp().getRequest().id,
    userId: host.switchToHttp().getRequest().user?.id,
  }),
})
```

## 🛠 Express Middleware

### Performance Logger Middleware

```typescript
import { performanceLoggerMiddleware } from '@starbemtech/star-node-stack-helper'

// Apply to specific routes
app.get(
  '/api/slow-operation',
  performanceLoggerMiddleware('my-service', 'slow-operation', 'production'),
  (req, res) => {
    // Middleware automatically measures and logs performance
    setTimeout(() => {
      res.json({ message: 'Operation completed' })
    }, 1000)
  }
)

// Apply to multiple routes
const performanceMiddleware = performanceLoggerMiddleware(
  'my-service',
  'api-call',
  'production'
)

app.use('/api', performanceMiddleware)
```

### Transaction Logger Middleware

```typescript
import {
  transactionLoggerMiddleware,
  ElasticLogger,
} from '@starbemtech/star-node-stack-helper'

const elasticLogger = new ElasticLogger(loggerConfig)

// Apply to specific routes
app.post(
  '/api/users',
  transactionLoggerMiddleware('user-service', 'create-user', elasticLogger),
  (req, res) => {
    // Middleware automatically captures (agora via evento 'finish'):
    // - Request metadata (method, path, baseUrl, route, host, ip/x-forwarded-for, userAgent, httpVersion)
    // - Context enriquecido com params/query/body sanitizados (campos sensíveis mascarados) e com limite de tamanho + hash
    // - Headers relevantes (x-user-id, x-platform, authorization [mascarado], content-type, etc.)
    // - Status/timing e responseSize (quando disponível via content-length)
    // - Geração/propagação de transactionId

    const user = createUser(req.body)
    res.status(201).json({
      user,
      transactionId: req.transactionId,
    })
  }
)

// Apply globally with different operations
app.use('/api', (req, res, next) => {
  const operation = `${req.method.toLowerCase()}-${req.path.split('/').pop()}`
  return transactionLoggerMiddleware('api-service', operation, elasticLogger)(
    req,
    res,
    next
  )
})
```

#### Notas

- O middleware usa `res.once('finish')` para garantir logging mesmo quando a resposta é enviada por `res.end` ou streams.
- O objeto `context` inclui `params`, `query` e `body` sanitizados de forma recursiva (campos sensíveis como `password`, `token`, `secret`, etc. são mascarados) e serialização limitada para evitar logs gigantes.
- Para propagar o identificador para clientes, combine com o middleware `addTransactionId`, que adiciona o header `X-Transaction-ID` à resposta.

### Transaction ID Middleware

```typescript
import { addTransactionId } from '@starbemtech/star-node-stack-helper'

// Add transaction ID to all requests
app.use(addTransactionId)

app.get('/api/data', (req, res) => {
  // req.transactionId is now available
  res.json({
    data: 'some data',
    transactionId: req.transactionId,
  })
})
```

## 📝 TypeScript Types

### Secret Configuration

```typescript
import {
  SecretConfig,
  RetryConfig,
  LoadSecretsOptions,
} from '@starbemtech/star-node-stack-helper'

interface SecretConfig {
  region: string
  secretName: string | string[]
  retry?: RetryConfig
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
}

interface RetryConfig {
  maxRetries: number
  retryDelay: number
  exponentialBackoff: boolean
}
```

### Logger Configuration

```typescript
import {
  LoggerConfig,
  LogLevel,
  LogTransaction,
} from '@starbemtech/star-node-stack-helper'

interface LoggerConfig {
  node: string
  service: string
  environment: string
  index: string
  region: string
  authType: 'aws' | 'basic'
  username?: string
  password?: string
}

interface LogTransaction {
  name: string
  microservice: string
  operation: string
  status: 'success' | 'fail'
  duration: number
  context?: Record<string, unknown>
  requestMeta?: {
    method: string
    path: string
    ip?: string
    userAgent?: string
  }
}
```

### Pino Logger Configuration

```typescript
import { PinoLoggerConfig } from '@starbemtech/star-node-stack-helper'

interface PinoLoggerConfig {
  serviceName: string
  environment: string
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  customFormatters?: {
    level?: (label: string) => unknown
    log?: (object: unknown) => unknown
  }
  customSerializers?: {
    req?: (req: unknown) => unknown
    res?: (res: unknown) => unknown
    err?: (err: unknown) => unknown
  }
  redactPaths?: string[]
}
```

### Slack Configuration

```typescript
import {
  SlackConfig,
  SlackMessage,
  SlackResponse,
  SlackNotificationOptions,
  SlackWebhookConfig,
  SlackWebhookMessage,
  SlackBlock,
  SlackAttachment,
} from '@starbemtech/star-node-stack-helper'

interface SlackConfig {
  token: string
  defaultChannel?: string
  botName?: string
  baseUrl?: string
}

interface SlackMessage {
  channel: string
  text: string
  blocks?: SlackBlock[]
  attachments?: SlackAttachment[]
  username?: string
  icon_emoji?: string
  icon_url?: string
  thread_ts?: string
  replace_original?: boolean
  delete_original?: boolean
}

interface SlackResponse {
  ok: boolean
  channel?: string
  ts?: string
  message?: {
    text: string
    user: string
    ts: string
    type: string
    subtype?: string
  }
  error?: string
  details?: string
}
```

## 🎯 Examples

### Complete Express Application

```typescript
import express from 'express'
import {
  ElasticLogger,
  LoggerConfig,
  loadSecrets,
  transactionLoggerMiddleware,
  createPinoLogger,
  createHttpLogger,
  performanceLoggerMiddleware,
  pinoLogContext,
} from '@starbemtech/star-node-stack-helper'

// Load secrets on startup
await loadSecrets({
  region: 'us-east-1',
  secretName: ['prod/database/credentials', 'prod/api/keys'],
})

// Configure loggers
const elasticConfig: LoggerConfig = {
  node: process.env.OPENSEARCH_ENDPOINT!,
  service: 'my-api',
  environment: 'production',
  index: 'api-logs',
  region: 'us-east-1',
  authType: 'aws',
}

const elasticLogger = new ElasticLogger(elasticConfig)
const pinoLogger = createPinoLogger({
  serviceName: 'my-api',
  environment: 'production',
  logLevel: 'info',
})

const app = express()

// Global middleware
app.use(createHttpLogger(pinoLogger))
app.use(express.json())

// Performance monitoring for all API routes
app.use(
  '/api',
  performanceLoggerMiddleware('my-api', 'api-request', 'production')
)

// Transaction logging for specific operations
app.post(
  '/api/users',
  transactionLoggerMiddleware('user-service', 'create-user', elasticLogger),
  async (req, res) => {
    try {
      const user = await createUser(req.body)

      pinoLogger.info('User created successfully', {
        ...pinoLogContext.request(req, { userId: user.id }),
        action: 'user_creation',
        userRole: user.role,
      })

      res.status(201).json({
        user,
        transactionId: req.transactionId,
      })
    } catch (error) {
      pinoLogger.error('Failed to create user', {
        ...pinoLogContext.request(req),
        ...pinoLogContext.error(error),
        action: 'user_creation',
      })

      res.status(500).json({
        error: 'Internal server error',
        transactionId: req.transactionId,
      })
    }
  }
)

app.listen(3000, () => {
  pinoLogger.info('Server started', {
    port: 3000,
    environment: 'production',
  })
})
```

### AWS Lambda Function

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda'
import {
  ElasticLogger,
  loadSecrets,
  pinoLogContext,
} from '@starbemtech/star-node-stack-helper'

// Load secrets once (Lambda container reuse)
let secretsLoaded = false
let logger: ElasticLogger

export const handler: APIGatewayProxyHandler = async (event) => {
  // Load secrets only once per container
  if (!secretsLoaded) {
    await loadSecrets({
      region: process.env.AWS_REGION!,
      secretName: ['prod/api/keys'],
    })

    logger = new ElasticLogger({
      node: process.env.OPENSEARCH_ENDPOINT!,
      service: 'lambda-api',
      environment: 'production',
      index: 'lambda-logs',
      region: process.env.AWS_REGION!,
      authType: 'aws',
    })

    secretsLoaded = true
  }

  try {
    // Your business logic here
    const result = await processRequest(event)

    // Log successful operation
    await logger.logTransaction({
      name: 'api-request',
      microservice: 'lambda-api',
      operation: 'process-request',
      status: 'success',
      duration: Date.now() - event.requestContext.requestTime,
      context: {
        path: event.path,
        method: event.httpMethod,
        userId: event.requestContext.authorizer?.userId,
      },
      requestMeta: {
        method: event.httpMethod,
        path: event.path,
        ip: event.requestContext.identity.sourceIp,
        userAgent: event.headers['User-Agent'],
      },
    })

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    }
  } catch (error) {
    // Log error
    await logger.log('error', 'Lambda function error', {
      ...pinoLogContext.error(error),
      path: event.path,
      method: event.httpMethod,
    })

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
```

## 📖 API Reference

### AWS Secrets Manager

#### `loadSecrets(config: SecretConfig | LoadSecretsOptions): Promise<void>`

Loads secrets from AWS Secrets Manager and sets them as environment variables.

**Parameters:**

- `config`: Configuration object with region, secret names, and optional retry settings

**Example:**

```typescript
await loadSecrets({
  region: 'us-east-1',
  secretName: ['prod/database/credentials'],
})
```

#### `testSavedSecrets(): void`

Tests if secrets were loaded correctly by logging environment variables.

#### `isRunningOnAWS(): boolean`

Returns `true` if the application is running on AWS (Lambda, EC2, etc.).

#### `getAWSRegion(): string | undefined`

Returns the current AWS region or `undefined` if not running on AWS.

### Elasticsearch/OpenSearch Logger

#### `new ElasticLogger(config: LoggerConfig)`

Creates a new ElasticLogger instance.

#### `logger.log(level: LogLevel, message: string, metadata?: Record<string, unknown>): Promise<void>`

Logs a message with the specified level and metadata.

#### `logger.logTransaction(transaction: LogTransaction): Promise<void>`

Logs a transaction with detailed metadata.

#### `logger.getSystemLogs(query: string | string[]): Promise<any[]>`

Searches system logs with the given query.

#### `logger.getLogsTransactions(query: string | string[]): Promise<any[]>`

Searches transaction logs with the given query.

#### `logger.healthCheck(): Promise<boolean>`

Checks the health of the OpenSearch cluster.

#### `logger.testConnection(): Promise<void>`

Tests the connection to OpenSearch.

#### `logger.flush(): Promise<void>`

Flushes all indices.

#### `logger.recreateIndex(): Promise<void>`

Recreates the index (useful for schema changes).

### Slack Notifications

#### `sendSlackMessage(message: SlackMessage, options: SlackNotificationOptions): Promise<SlackResponse>`

Sends a message to Slack using the official API.

**Parameters:**

- `message`: The message to send with channel, text, and optional formatting
- `options`: Configuration including token, retry settings, error handling, and channel membership check

**Options:**

- `config`: Slack configuration with token and default settings
- `retryConfig`: Retry configuration for failed requests
- `failSilently`: Whether to throw errors or return error responses
- `checkChannelMembership`: Whether to verify bot is in channel before sending (default: false)

**Example:**

```typescript
const response = await sendSlackMessage(
  {
    channel: '#general',
    text: 'Hello from my app!',
    username: 'My Bot',
  },
  {
    config: {
      token: 'xoxb-your-bot-token',
      defaultChannel: '#general',
    },
    failSilently: true,
  }
)
```

#### `sendSlackWebhook(message: SlackWebhookMessage, config: SlackWebhookConfig, options?: object): Promise<SlackResponse>`

Sends a message to Slack using a webhook.

**Parameters:**

- `message`: The message to send
- `config`: Webhook configuration with URL and default settings
- `options`: Optional retry and error handling settings

#### `createSectionBlock(text: string, options?: object): SlackBlock`

Creates a section block for formatted messages. **Now includes automatic text sanitization and validation.**

#### `createDividerBlock(): SlackBlock`

Creates a divider block for visual separation. **Recommended for replacing empty section blocks.**

#### `createButtonElement(text: string, value: string, options?: object): SlackElement`

Creates a button element for interactive messages.

#### `createActionBlock(elements: SlackElement[], blockId?: string): SlackBlock`

Creates an actions block with buttons.

#### `createSlackAttachment(options: object): SlackAttachment`

Creates an attachment for rich message formatting.

#### `new SlackNotifier(config: SlackConfig, options?: object)`

Creates a SlackNotifier instance for convenient message management.

**Methods:**

- `sendMessage(text: string, channel?: string): Promise<SlackResponse>`
- `sendSuccess(message: string, channel?: string): Promise<SlackResponse>`
- `sendError(error: string, channel?: string): Promise<SlackResponse>`
- `sendWarning(warning: string, channel?: string): Promise<SlackResponse>`
- `sendFormattedMessage(blocks: SlackBlock[], channel?: string, fallbackText?: string): Promise<SlackResponse>`

### Pino Logger

#### `createPinoLogger(config: PinoLoggerConfig): pino.Logger`

Creates a configured Pino logger instance.

#### `createHttpLogger(logger: pino.Logger, options?: HttpLoggerOptions): HttpLogger`

Creates an Express HTTP logging middleware.

#### `pinoLogContext.request(req: Request, additionalData?: Record<string, unknown>): Record<string, unknown>`

Creates request context for logging.

#### `pinoLogContext.error(error: Error, context?: Record<string, unknown>): Record<string, unknown>`

Creates error context for logging.

#### `pinoLogContext.performance(operation: string, duration: number, metadata?: Record<string, unknown>): Record<string, unknown>`

Creates performance context for logging.

### Express Middleware

#### `performanceLoggerMiddleware(service: string, operation: string, environment: string): ExpressMiddleware`

Creates middleware that measures and logs request performance.

#### `transactionLoggerMiddleware(service: string, operation: string, elasticLogger: ElasticLogger | null): ExpressMiddleware`

Creates middleware that logs detailed transaction information.

#### `addTransactionId(req: Request, res: Response, next: NextFunction): void`

Adds a transaction ID to the request object.

### NestJS Integration

#### Decorators

##### `@Log(level: LogLevel, message: string)`

Decorator for basic logging with specified level and message.

##### `@LogPerformance(operation: string)`

Decorator for performance logging that automatically measures execution time.

##### `@LogError(message: string)`

Decorator for error logging with specified message.

##### `@LogCritical(message: string)`

Decorator for critical error logging.

##### `@TransactionLog(options: TransactionLogOptions)`

Decorator for transaction logging with custom options.

#### Interceptors

##### `TransactionLogInterceptor`

Manual transaction logging interceptor for NestJS applications.

**Constructor Options:**

- `microservice: string` - Name of the microservice
- `operation: string` - Operation being performed
- `elasticLogger: ElasticLogger` - ElasticLogger instance
- `customContext?: (context: ExecutionContext) => Record<string, unknown>` - Custom context function

##### `AutoTransactionLogInterceptor`

Automatic transaction logging interceptor that reads metadata from decorators.

**Constructor Options:**

- `elasticLogger: ElasticLogger` - ElasticLogger instance
- `defaultMicroservice?: string` - Default microservice name
- `customContext?: (context: ExecutionContext) => Record<string, unknown>` - Custom context function

#### Guards

##### `LogGuard`

Guard for authentication/authorization with automatic logging.

**Constructor Options:**

- `elasticLogger: ElasticLogger` - ElasticLogger instance
- `logLevel?: LogLevel` - Log level for guard operations
- `customContext?: (context: ExecutionContext) => Record<string, unknown>` - Custom context function

#### Exception Filters

##### `LogExceptionFilter`

Exception filter that automatically logs errors to Elasticsearch/OpenSearch.

**Constructor Options:**

- `elasticLogger: ElasticLogger` - ElasticLogger instance
- `logLevel?: LogLevel` - Log level for exceptions
- `customContext?: (host: ArgumentsHost) => Record<string, unknown>` - Custom context function

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@starbem.app or create an issue in the GitHub repository.

## 📚 API Reference

### Pino Logger

#### `createPinoLogger(config: PinoLoggerConfig): pino.Logger`

Creates a configured Pino logger instance with optimized settings for development and production.

**Parameters:**

- `config.serviceName`: Name of the service
- `config.environment`: Environment ('development' | 'production')
- `config.logLevel`: Log level ('trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal')

#### `createHttpLogger(logger: pino.Logger): HttpLogger`

Creates an Express HTTP logging middleware with optimized settings.

**Features:**

- Automatic silent routes for health checks and metrics
- Smart log levels based on status codes
- Request/response serialization
- Performance tracking

#### `pinoLogContext.request(req: Request, additionalData?: any): object`

Creates request context for logging.

#### `pinoLogContext.error(error: Error, context?: any): object`

Creates error context for logging.

#### `pinoLogContext.performance(operation: string, duration: number, metadata?: any): object`

Creates performance context for logging.

#### `pinoLogContext.proxy(target: string, service: string, metadata?: any): object`

Creates proxy/API Gateway context for logging.

## 🔗 Links

- [GitHub Repository](https://github.com/starbem/star-node-stack-helper)
- [NPM Package](https://www.npmjs.com/package/@starbemtech/star-node-stack-helper)
- [Documentation](https://github.com/starbem/star-node-stack-helper#readme)
