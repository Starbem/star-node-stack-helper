# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-19

### Added

- **IAM Roles Support**: Automatic AWS credentials detection for EC2, Lambda, and ECS
- **Retry Logic**: Exponential backoff retry mechanism for AWS Secrets Manager operations
- **Health Check**: `healthCheck()` method for Elasticsearch/OpenSearch cluster monitoring
- **Utility Functions**:
  - `isRunningOnAWS()` - Detect if running on AWS infrastructure
  - `getAWSRegion()` - Get AWS region from environment variables
  - `testSavedSecrets()` - Debug function for development
- **Enhanced Type Safety**: Strict TypeScript configuration with comprehensive type checking
- **SSL Security**: Conditional SSL verification based on environment
- **Comprehensive Error Handling**: Better error messages and logging
- **Input Validation**: Robust validation for all configuration parameters

### Changed

- **TypeScript Configuration**: Upgraded to strict mode with additional safety checks
- **Jest Configuration**: Optimized test setup with coverage reporting
- **Package.json**: Added new scripts and improved dependencies
- **Documentation**: Complete README rewrite with comprehensive examples
- **Error Messages**: More descriptive and actionable error messages

### Fixed

- **SSL Configuration**: Fixed insecure SSL settings in production
- **Duplicate Code**: Eliminated code duplication in search methods
- **Type Safety**: Removed all `any` types and added proper interfaces
- **Configuration Validation**: Added validation for all required fields

### Security

- **IAM Integration**: Support for AWS IAM roles instead of hardcoded credentials
- **SSL Verification**: Proper SSL verification in production environments
- **Input Sanitization**: Validation and sanitization of all inputs

## [1.0.0] - 2024-12-18

### Added

- Initial release
- AWS Secrets Manager integration
- Elasticsearch/OpenSearch logging
- Basic TypeScript support
- Jest testing setup
- ESLint and Prettier configuration
- Docker development environment

### Features

- `loadSecrets()` - Load secrets from AWS Secrets Manager
- `ElasticLogger` - Comprehensive logging with transaction tracking
- Basic error handling and logging
- Development tools integration

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/). For the versions available, see the [tags on this repository](https://github.com/starbem/star-node-stack-helper/tags).

## Migration Guide

### From 1.0.0 to 1.1.0

#### Breaking Changes

- TypeScript strict mode is now enabled by default
- SSL verification is now enabled in production environments
- Some error messages have changed for better clarity

#### New Features

- IAM roles are now supported automatically
- Retry logic is built-in for better reliability
- Health check functionality is available

#### Recommended Updates

1. Update your TypeScript configuration if needed
2. Test SSL connections in production
3. Consider using IAM roles instead of hardcoded credentials
4. Implement health checks for monitoring

#### Code Changes

```typescript
// Old way (still works)
const secrets = await loadSecrets({
  region: 'us-east-1',
  accessKeyId: 'YOUR_KEY',
  secretAccessKey: 'YOUR_SECRET',
  secretName: 'my-secret',
})

// New way (recommended)
const secrets = await loadSecrets({
  region: 'us-east-1',
  secretName: 'my-secret',
  // IAM roles are automatically detected
})

// New health check
const isHealthy = await logger.healthCheck()
```
