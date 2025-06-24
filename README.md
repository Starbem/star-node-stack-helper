# Star Node Stack Helper

A helper library for Node.js applications that provides utilities for AWS Secrets Manager integration and Elasticsearch logging.

## Features

- 🔐 AWS Secrets Manager integration for secure secret management
- 📝 Elasticsearch logging with transaction tracking
- 🛡️ TypeScript support
- 🧪 Jest testing setup
- 📦 Modern development tools (ESLint, Prettier, Husky)

## Installation

```bash
npm install star-node-stack-helper
# or
yarn add star-node-stack-helper
# or
pnpm add star-node-stack-helper
```

## Usage

### AWS Secrets Manager

The library provides a simple way to load secrets from AWS Secrets Manager and automatically set them as environment variables.

```typescript
import { loadSecrets } from 'star-node-stack-helper'

// Load a single secret
await loadSecrets({
  region: 'us-east-1',
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_KEY',
  secretName: 'my-secret',
})

// Load multiple secrets
await loadSecrets({
  region: 'us-east-1',
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_KEY',
  secretName: ['my-secret-1', 'my-secret-2'],
})
```

### Elasticsearch Logger

The library includes an Elasticsearch logger that supports both regular logging and transaction tracking.

```typescript
import { ElasticLogger } from 'star-node-stack-helper'

// Initialize the logger
const logger = new ElasticLogger({
  node: 'http://localhost:9200',
  username: 'admin',
  password: 'admin',
  index: 'my-service-logs',
  service: 'my-service',
  environment: 'development',
})

// Log a message
await logger.log('info', 'User logged in', {
  userId: '123',
  timestamp: new Date(),
})

// Log an error
await logger.log('error', 'Failed to process payment', {
  error: new Error('Insufficient funds'),
  transactionId: 'tx_123',
})

// Log a transaction with returned successful
const start = Date.now()
await logger.logTransaction({
  name: 'purchase_consultation',
  status: 'success',
  duration: Date.now() - start,
  context: {
    userId: 'user_123',
    transactionId: 'tx_123',
    paymentMethod: 'credit_card',
    amount: 100,
    currency: 'USD',
  },
  requestMeta: {
    method: 'POST',
    path: '/appointments/purchase',
    ip: '186.12.34.56',
  },
})

// Log a transaction with returned fail
await logger.logTransaction({
  name: 'purchase_consultation',
  status: 'fail',
  duration: Date.now() - start,
  context: {
    userId: 'user_123',
    transactionId: 'tx_123',
    paymentMethod: 'credit_card',
    amount: 100,
    currency: 'USD',
  },
  requestMeta: {
    method: 'POST',
    path: '/appointments/purchase',
    ip: '186.12.34.56',
  },
  error: {
    message: 'Insufficient funds',
  },
})

// Flush logs to ensure they are written
await logger.flush()
```

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

### Docker Development Environment

The library includes a Docker Compose configuration for local development with OpenSearch and OpenSearch Dashboards.

```bash
cd dev
docker-compose up -d
```

This will start:

- OpenSearch on http://localhost:9200
- OpenSearch Dashboards on http://localhost:5601

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
