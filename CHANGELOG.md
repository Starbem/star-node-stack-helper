# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [] - 2025-09-10

## [] - 2025-06-25

## [] - 2025-06-25

## [] - 2025-06-25

### Added

- GitHub Actions pipeline for automated releases
- Automated changelog generation
- Quality checks and security audits
- Dependabot configuration for dependency updates

### Changed

- Improved build process with TypeScript configuration
- Enhanced package.json with versioning scripts

## [1.1.0] - 2024-01-XX

### Added

- Initial release of star-node-stack-helper
- AWS Secrets Manager integration utilities
- Elasticsearch/OpenSearch logging with enterprise features
- IAM roles support
- Retry logic implementation
- Health check utilities

### Features

- Comprehensive TypeScript support
- Full test coverage
- ESLint and Prettier configuration
- Husky pre-commit hooks

---

## Release Process

This project uses automated releases via GitHub Actions. When a new tag is pushed:

1. **Tests are run** on multiple Node.js versions (18, 20, 22)
2. **Package is built** and validated
3. **Published to NPM** automatically
4. **GitHub Release is created** with changelog
5. **Release notes are updated** with recent changes

### Making a Release

```bash
# 1. Choose version type
pnpm run version:patch   # 1.1.0 → 1.1.1
pnpm run version:minor   # 1.1.0 → 1.2.0
pnpm run version:major   # 1.1.0 → 2.0.0

# 2. Push tag to trigger release
git push origin --tags
```

### Release Links

- [NPM Package](https://www.npmjs.com/package/star-node-stack-helper)
- [GitHub Releases](https://github.com/starbem/star-node-stack-helper/releases)
- [GitHub Actions](https://github.com/starbem/star-node-stack-helper/actions)

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
