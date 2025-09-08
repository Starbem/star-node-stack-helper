# Star Node Stack Helper

A helper library for Node.js applications that provides utilities for AWS Secrets Manager integration and Elasticsearch/OpenSearch logging with enterprise-grade features.

## Features

- 🔐 AWS Secrets Manager integration with IAM roles support
- 📝 Elasticsearch/OpenSearch logging with transaction tracking
- 🛡️ TypeScript support with strict type checking
- 🧪 Jest testing setup with coverage reporting
- 📦 Modern development tools (ESLint, Prettier, Husky)
- 🔄 Retry logic with exponential backoff
- 🏥 Health check and monitoring utilities
- 🔒 SSL security configuration
- 📊 Comprehensive error handling and logging

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

### Elasticsearch/OpenSearch Logger

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

## Author

Julio Sousa <julio.sousa@starbem.app>
