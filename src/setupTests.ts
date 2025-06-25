// Test setup file for Jest
// This file runs before each test file

// Set test environment variables
process.env['NODE_ENV'] = 'test'

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn()
  console.error = jest.fn()
  console.warn = jest.fn()
})

afterAll(() => {
  // Restore original console methods
  console.log = originalConsoleLog
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Global test timeout
jest.setTimeout(30000)

// Mock AWS SDK for testing
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      SecretString: JSON.stringify({
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        API_KEY: 'test-api-key',
        NODE_ENV: 'test',
      }),
    }),
  })),
  GetSecretValueCommand: jest.fn(),
}))

// Mock OpenSearch client for testing
jest.mock('@opensearch-project/opensearch', () => ({
  Client: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockResolvedValue({ body: { result: 'created' } }),
    search: jest.fn().mockResolvedValue({
      body: {
        hits: {
          hits: [
            {
              _index: 'test-index',
              _id: 'test-id',
              _score: 1.0,
              _source: {
                message: 'test message',
                level: 'info',
                timestamp: new Date().toISOString(),
              },
            },
          ],
        },
      },
    }),
    indices: {
      refresh: jest.fn().mockResolvedValue({ body: { acknowledged: true } }),
    },
    ping: jest
      .fn()
      .mockResolvedValue({ body: { cluster_name: 'test-cluster' } }),
  })),
}))

// Mock UUID for consistent testing
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-12345'),
}))
