# Star Node Stack Helper

A helper library for Node.js applications that provides utilities for AWS Secrets Manager integration and Elasticsearch/OpenSearch logging with enterprise-grade features.

## Features

- 🔐 AWS Secrets Manager integration with IAM roles support
- 📝 Elasticsearch/OpenSearch logging with transaction tracking
- 🚀 **NEW**: Advanced logging system with middleware and decorators
- 🎯 **NEW**: Automatic transaction logging for Express.js applications
- 🏷️ **NEW**: Business event logging and security event tracking
- 🛡️ TypeScript support with strict type checking
- 🧪 Jest testing setup with coverage reporting
- 📦 Modern development tools (ESLint, Prettier, Husky)
- 🔄 Retry logic with exponential backoff
- 🏥 Health check and monitoring utilities
- 🔒 SSL security configuration
- 📊 Comprehensive error handling and logging
- 🎨 **NEW**: Decorators for automatic logging in controllers
- 🔧 **NEW**: LoggerFactory for easy initialization
- 🛠️ **NEW**: Utility functions for request parsing and sensitive data filtering
- 📝 **NEW**: Pino logger for local development and fallback logging

## Installation

```bash
npm install @starbemtech/star-node-stack-helper
# or
yarn add @starbemtech/star-node-stack-helper
# or
pnpm add @starbemtech/star-node-stack-helper
```

## Usage

### AWS Secrets Manager

The library provides a robust way to load secrets from AWS Secrets Manager with support for IAM roles, retry logic, and automatic environment variable injection.

#### Basic Usage

```typescript
import {
  loadSecrets,
  isRunningOnAWS,
  getAWSRegion,
} from 'star-node-stack-helper'

// Load a single secret
const secrets = await loadSecrets({
  region: 'us-east-1',
  secretName: 'my-secret',
})

// Load multiple secrets
const secrets = await loadSecrets({
  region: 'us-east-1',
  secretName: ['my-secret-1', 'my-secret-2'],
})
```

#### Using IAM Roles (Recommended for Production)

```typescript
// When running on AWS (EC2, Lambda, ECS), credentials are automatically detected
const secrets = await loadSecrets({
  region: 'us-east-1',
  secretName: 'production/database-credentials',
})

// Check if running on AWS
if (isRunningOnAWS()) {
  console.log('Running on AWS infrastructure')
}

// Get AWS region from environment
const region = getAWSRegion() // Returns 'us-east-1' or undefined
```

#### Using Explicit Credentials (Development)

```typescript
const secrets = await loadSecrets({
  region: 'us-east-1',
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_KEY',
  secretName: 'dev/my-secret',
})
```

#### Custom Retry Configuration

```typescript
const secrets = await loadSecrets(
  {
    region: 'us-east-1',
    secretName: 'my-secret',
  },
  {
    maxAttempts: 5,
    delayMs: 2000,
  }
)
```

#### Debug Secrets (Development Only)

```typescript
import { testSavedSecrets } from 'star-node-stack-helper'

// Load secrets
await loadSecrets({
  region: 'us-east-1',
  secretName: 'my-secret',
})

// Display all environment variables (useful for debugging)
testSavedSecrets()
```

### Advanced Logging System

The library now includes a comprehensive logging system with automatic transaction tracking, middleware for Express.js, decorators for controllers, and business event logging.

#### Quick Start with LoggerFactory

```typescript
import {
  initializeLogger,
  transactionLogger,
  addTransactionId,
} from '@starbemtech/star-node-stack-helper'

// Initialize logging system
const result = await initializeLogger('my-service', 'development')
if (!result.success) {
  console.error('Failed to initialize logging:', result.error)
}

// Use in Express.js routes
app.get(
  '/api/endpoint',
  addTransactionId,
  transactionLogger('operation_name'),
  controller
)
```

#### Using Decorators in Controllers

```typescript
import {
  LoggedApiOperation,
  LoggedBusinessOperation,
  LoggedMethod,
} from '@starbemtech/star-node-stack-helper'

class ExampleController {
  @LoggedApiOperation('create_resource', {
    logRequest: true,
    logPerformance: true,
    logBusinessEvent: true,
    businessEventName: 'resource_created',
    sensitiveFields: ['password', 'token', 'secret'],
  })
  async createResource(req: Request, res: Response) {
    // Automatic logging of request, performance, and business events
    // Your business logic here
  }

  @LoggedBusinessOperation('process_payment', 'payment_processed')
  async processPayment(req: Request, res: Response) {
    // Automatic logging for business operations
  }

  @LoggedMethod({
    operation: 'validate_data',
    logBusinessEvent: true,
    businessEventName: 'data_validated',
  })
  async validateData(req: Request, res: Response) {
    // Custom logging configuration
  }
}
```

#### System Logger for Business Events

```typescript
import {
  getSystemLogger,
  logBusinessEvent,
  logSecurityEvent,
} from '@starbemtech/star-node-stack-helper'

// Log business events
await logBusinessEvent('resource_created', {
  resourceId: 'res_12345',
  resourceType: 'document',
  duration: 150,
})

// Log security events
await logSecurityEvent('user_authentication_attempt', {
  userId: 'user123',
  ip: '192.168.1.100',
  success: false,
})
```

### Elasticsearch/OpenSearch Logger (Legacy)

The library includes a comprehensive Elasticsearch/OpenSearch logger with transaction tracking, health monitoring, and robust error handling.

#### Basic Setup

```typescript
import { ElasticLogger } from 'star-node-stack-helper'

// Initialize the logger with AWS Authentication
const logger = new ElasticLogger({
  node: 'your aws node url',
  authType: 'aws',
  index: 'my-service-logs',
  service: 'my-service',
  environment: 'development',
})

// Initialize the logger with username and password
const logger = new ElasticLogger({
  node: 'http://localhost:9200',
  username: 'admin',
  password: 'admin',
  index: 'my-service-logs',
  service: 'my-service',
  environment: 'development',
})
```

#### Logging Messages

```typescript
// Log an info message
await logger.log('info', 'User logged in successfully', {
  userId: '123',
  sessionId: 'sess_456',
  timestamp: new Date(),
})

// Log a warning
await logger.log('warn', 'High memory usage detected', {
  memoryUsage: process.memoryUsage(),
  threshold: 80,
})

// Log an error
await logger.log('error', 'Failed to process payment', {
  error: new Error('Insufficient funds'),
  transactionId: 'tx_123',
  userId: 'user_456',
})

// Log debug information
await logger.log('debug', 'Processing request', {
  requestId: 'req_789',
  method: 'POST',
  path: '/api/payments',
})
```

#### Transaction Logging

```typescript
// Successful transaction
const startTime = Date.now()
try {
  // Your business logic here
  await processPayment()

  await logger.logTransaction({
    name: 'payment_processing',
    status: 'success',
    duration: Date.now() - startTime,
    context: {
      userId: 'user_123',
      transactionId: 'tx_456',
      paymentMethod: 'credit_card',
      amount: 100.5,
      currency: 'USD',
    },
    requestMeta: {
      method: 'POST',
      path: '/api/payments',
      ip: '192.168.1.100',
    },
  })
} catch (error) {
  // Failed transaction
  await logger.logTransaction({
    name: 'payment_processing',
    status: 'fail',
    duration: Date.now() - startTime,
    context: {
      userId: 'user_123',
      transactionId: 'tx_456',
      paymentMethod: 'credit_card',
      amount: 100.5,
      currency: 'USD',
    },
    requestMeta: {
      method: 'POST',
      path: '/api/payments',
      ip: '192.168.1.100',
    },
    error: {
      message: error instanceof Error ? error.message : 'Unknown error',
    },
  })
}
```

#### Searching Logs

```typescript
// Search system logs
const systemLogs = await logger.getSystemLogs('Log example')
console.log('Found system logs:', systemLogs)

// Search transaction logs
const transactions = await logger.getLogsTransactions(['payment_processing'])
console.log('Found transactions:', transactions)

// Search with multiple terms
const logs = await logger.getSystemLogs(['user_123', 'payment'])
```

#### Health Monitoring

```typescript
// Check cluster health
const isHealthy = await logger.healthCheck()
if (isHealthy) {
  console.log('Elasticsearch cluster is healthy')
} else {
  console.error('Elasticsearch cluster health check failed')
}

// Flush indices to ensure logs are visible
await logger.flush()
```

#### Production Configuration

```typescript
const logger = new ElasticLogger({
  node: 'https://your-opensearch-cluster:9200',
  username: process.env.OPENSEARCH_USERNAME,
  password: process.env.OPENSEARCH_PASSWORD,
  index: 'production-logs',
  service: 'payment-service',
  environment: 'production',
})
```

## Configuration

### Environment Variables

The library automatically detects AWS credentials from environment variables:

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region
- `NODE_ENV` - Environment (production/development)

### SSL Configuration

- **Development**: SSL verification is disabled for local development
- **Production**: SSL verification is enabled by default

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8.6.2

### Setup

1. Install dependencies:

```bash
pnpm install
```

2. Build the project:

```bash
pnpm build
```

3. Run tests:

```bash
pnpm test
```

4. Run tests with coverage:

```bash
pnpm test:coverage
```

5. Lint code:

```bash
pnpm lint
```

6. Format code:

```bash
pnpm format
```

### Docker Development Environment

The library includes a Docker Compose configuration for local development with OpenSearch and OpenSearch Dashboards.

```bash
cd dev
docker-compose up -d
```

This will start:

- OpenSearch on http://localhost:9200
- OpenSearch Dashboards on http://localhost:5601

### Available Scripts

- `pnpm build` - Build the project
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage
- `pnpm test:ci` - Run tests for CI environment
- `pnpm lint` - Lint code
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Format code
- `pnpm clean` - Clean build artifacts

## Error Handling

The library provides comprehensive error handling:

```typescript
try {
  await logger.log('info', 'Processing request')
} catch (error) {
  console.error('Logging failed:', error.message)
  // Implement fallback logging or error handling
}

try {
  const secrets = await loadSecrets({
    region: 'us-east-1',
    secretName: 'my-secret',
  })
} catch (error) {
  console.error('Failed to load secrets:', error.message)
  // Handle secret loading failure
}
```

## Troubleshooting

### OpenSearch Authentication Issues

If you encounter authentication errors like `security_exception` or `authorization_exception`, follow these steps:

#### 1. Test Connection and Permissions

```typescript
const logger = new ElasticLogger({
  node: 'https://your-opensearch-cluster:9200',
  username: 'your-username',
  password: 'your-password',
  index: 'your-logs',
  service: 'your-service',
  environment: 'production',
})

// Test connection and permissions
const connectionTest = await logger.testConnection()
if (!connectionTest.success) {
  console.error('Connection test failed:', connectionTest.error)
  // Handle the error appropriately
}

// Validate configuration
const configValidation = logger.validateLoggerConfig()
if (!configValidation.valid) {
  console.error('Configuration errors:', configValidation.errors)
}
```

#### 2. Common Solutions

**For AWS OpenSearch Service:**

```typescript
// Use IAM authentication instead of username/password
const logger = new ElasticLogger({
  node: 'https://your-domain.region.es.amazonaws.com',
  // Remove username/password - use IAM roles
  index: 'your-logs',
  service: 'your-service',
  environment: 'production',
})
```

**For Self-hosted OpenSearch:**

```typescript
// Ensure user has proper permissions
const logger = new ElasticLogger({
  node: 'https://your-opensearch:9200',
  username: 'admin', // Use admin user or user with write permissions
  password: 'admin-password',
  index: 'your-logs',
  service: 'your-service',
  environment: 'production',
})
```

#### 3. Check OpenSearch User Permissions

Ensure your OpenSearch user has the following permissions:

- `indices:data/write/index` for the log index
- `indices:data/write/delete` for cleanup operations
- `indices:admin/create` for index creation (if auto-create is enabled)

#### 4. SSL/TLS Issues

```typescript
// For development with self-signed certificates
const logger = new ElasticLogger({
  node: 'https://localhost:9200',
  username: 'admin',
  password: 'admin',
  index: 'test-logs',
  service: 'test-service',
  environment: 'development',
  // SSL verification is automatically disabled in development
})
```

#### 5. Mapping Issues

If you encounter `mapper_parsing_exception` errors, it means the index has incorrect field mappings:

```typescript
// Check and fix mapping automatically
const mappingResult = await logger.checkAndFixIndexMapping()
if (!mappingResult.success) {
  console.error('Mapping fix failed:', mappingResult.error)

  // Option 1: Recreate index (WARNING: deletes all data)
  const recreateResult = await logger.recreateIndex()

  // Option 2: Use the fix-mapping script
  // node example/fix-mapping.ts
}
```

**Common Mapping Issues:**

- Field `message` defined as `object` instead of `text`
- Missing field definitions
- Incorrect data types

**Manual Fix via OpenSearch Dashboards:**

```json
PUT your-index/_mapping
{
  "properties": {
    "message": { "type": "text" },
    "timestamp": { "type": "date" },
    "level": { "type": "keyword" },
    "service": { "type": "keyword" }
  }
}
```

## Best Practices

### Security

1. **Use IAM Roles** in production instead of hardcoded credentials
2. **Enable SSL** in production environments
3. **Validate inputs** before processing
4. **Handle errors gracefully** with appropriate fallbacks

### Performance

1. **Reuse logger instances** instead of creating new ones
2. **Use appropriate log levels** (debug, info, warn, error)
3. **Batch operations** when possible
4. **Monitor cluster health** regularly

### Monitoring

1. **Set up alerts** for cluster health failures
2. **Monitor log volume** and performance
3. **Use transaction logging** for business-critical operations
4. **Implement proper error tracking**

## Contributing

We welcome contributions to improve this library! Here's how you can help:

### Development Workflow

1. Fork the repository
2. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Run tests to ensure everything works:
   ```bash
   pnpm test
   ```
5. Commit your changes following the conventional commits format:
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve issue with X"
   ```
6. Push your branch and create a Pull Request

### Code Style

- Follow the existing code style
- Use TypeScript for all new code
- Write tests for new features
- Update documentation when adding new features
- Ensure all tests pass before submitting a PR

### Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the version numbers in package.json following [SemVer](https://semver.org/)
3. The PR will be merged once you have the sign-off of at least one maintainer

## License

MIT

## Advanced Features

### Middleware for Express.js

The library provides middleware for automatic transaction logging in Express.js applications:

```typescript
import {
  transactionLogger,
  addTransactionId,
} from '@starbemtech/star-node-stack-helper'

// Add transaction ID to all requests
app.use(addTransactionId)

// Log transactions for specific routes with custom configuration
app.post(
  '/api/resources',
  transactionLogger('create_resource', {
    sensitiveFields: ['password', 'token', 'secret'],
    customExtractors: {
      userId: (req) => req.headers['x-user-id'],
      tenantId: (req) => req.headers['x-tenant-id'],
    },
  }),
  controller
)
```

### Decorators for Controllers

Use decorators to automatically add logging to your controller methods:

```typescript
import {
  LoggedMethod,
  LoggedApiOperation,
  LoggedBusinessOperation,
} from '@starbemtech/star-node-stack-helper'

class MyController {
  @LoggedApiOperation('create_resource', {
    logRequest: true,
    logPerformance: true,
    logBusinessEvent: true,
    businessEventName: 'resource_created',
  })
  async createResource(req: Request, res: Response) {
    // Automatic logging of request, performance, and business events
  }

  @LoggedBusinessOperation('process_payment', 'payment_processed')
  async processPayment(req: Request, res: Response) {
    // Automatic logging for business operations
  }

  @LoggedMethod({
    operation: 'custom_operation',
    logRequest: true,
    logPerformance: true,
    logBusinessEvent: true,
    businessEventName: 'custom_event',
  })
  async customMethod(req: Request, res: Response) {
    // Custom logging configuration
  }
}
```

### Utility Functions

The library includes utility functions for request parsing and sensitive data filtering:

```typescript
import {
  extractRequestData,
  filterSensitiveFields,
  generateTransactionId,
} from '@starbemtech/star-node-stack-helper'

// Extract request data
const requestData = extractRequestData(req, ['password', 'token'])

// Filter sensitive fields
const filteredData = filterSensitiveFields(data, ['password', 'secret'])

// Generate transaction ID
const transactionId = generateTransactionId()
```

### Environment Configuration

The library automatically configures itself based on the environment:

```typescript
import { getEnvironmentConfig } from '@starbemtech/star-node-stack-helper'

// Get configuration for current environment
const config = getEnvironmentConfig(process.env.NODE_ENV || 'development')

// Initialize with environment-specific config
const result = await LoggerFactory.initialize(config)
```

## Pino Logger (Local Development)

The library includes a Pino logger for local development, testing, and fallback scenarios when OpenSearch is not available.

### Basic Usage

```typescript
import {
  PinoLogger,
  getPinoConfig,
  initializePinoLogger,
} from '@starbemtech/star-node-stack-helper'

// Create a Pino logger instance
const pinoLogger = new PinoLogger({
  level: 'debug',
  service: 'my-service',
  environment: 'development',
  pretty: true, // Pretty print for development
  redact: ['password', 'token', 'secret'], // Sensitive fields to redact
})

// Basic logging
pinoLogger.info('Application started')
pinoLogger.debug('Debug information', { userId: 123, action: 'login' })
pinoLogger.warn('Warning message', { warning: 'Rate limit approaching' })
pinoLogger.error('Error occurred', new Error('Something went wrong'))
```

### Specialized Logging Methods

```typescript
// Business events
pinoLogger.business('user_registration', {
  userId: 456,
  email: 'user@example.com',
  plan: 'premium',
})

// Security events
pinoLogger.security('failed_login_attempt', {
  email: 'user@example.com',
  ip: '192.168.1.100',
  reason: 'invalid_password',
})

// Performance metrics
pinoLogger.performance('database_query', 150, {
  query: 'SELECT * FROM users',
  rowsReturned: 1000,
})

// Transaction tracking
const transactionId = 'txn_' + Date.now()
pinoLogger.transaction(transactionId, 'order_creation', {
  userId: 456,
  total: 99.99,
})

// System events
pinoLogger.system('service_startup', {
  version: '1.0.0',
  port: 3000,
  environment: 'development',
})
```

### Child Loggers

```typescript
// Create a child logger with additional context
const userLogger = pinoLogger.child({ userId: 789, sessionId: 'sess_123' })
userLogger.info('User logged in')
userLogger.business('profile_update', { fields: ['name', 'email'] })
```

### Global Logger

```typescript
// Initialize global logger
const pinoConfig = getPinoConfig('development')
pinoConfig.service = 'my-service'
const globalLogger = initializePinoLogger(pinoConfig)

// Use global logger anywhere
import { getPinoLogger } from '@starbemtech/star-node-stack-helper'
const logger = getPinoLogger()
logger.info('Using global logger')
```

### Integration with LoggerFactory

The Pino logger is automatically initialized when using `LoggerFactory`:

```typescript
const result = await LoggerFactory.initialize(config)
if (result.success) {
  // Pino logger is available for local logging
  const pinoLogger = result.pinoLogger
  pinoLogger.info('System initialized with both OpenSearch and Pino logging')
}
```

### Examples

Check the `examples/` directory for complete examples:

- `basic-usage.ts` - Basic logging examples including Pino logger
- `pino-usage.ts` - Comprehensive Pino logger examples
- `express-integration.ts` - Complete Express.js integration example
- `generic-usage.ts` - Generic usage examples for any domain

## Migration Guide

### From v1.x to v2.x

The new logging system is backward compatible with the existing `ElasticLogger`. To migrate:

1. **Update imports**:

   ```typescript
   // Old
   import { ElasticLogger } from '@starbemtech/star-node-stack-helper'

   // New
   import {
     initializeLogger,
     getSystemLogger,
   } from '@starbemtech/star-node-stack-helper'
   ```

2. **Initialize the new system**:

   ```typescript
   // Initialize once in your application
   await initializeLogger('my-service', 'production')
   ```

3. **Use the new logging functions**:

   ```typescript
   // Old
   const logger = new ElasticLogger(config)
   await logger.log('info', 'message')

   // New
   await logInfo('message', { context: 'data' })
   ```

4. **Add middleware to routes**:
   ```typescript
   app.get(
     '/api/endpoint',
     addTransactionId,
     transactionLogger('operation_name'),
     controller
   )
   ```

## Author

Julio Sousa <julio.sousa@starbem.app>
