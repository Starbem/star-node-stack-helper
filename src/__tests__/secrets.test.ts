/// <reference types="jest" />
import {
  loadSecrets,
  isRunningOnAWS,
  getAWSRegion,
  testSavedSecrets,
} from '../secrets'
import { SecretConfig, RetryConfig } from '../secrets/types'

describe('Secrets Module', () => {
  const mockConfig: SecretConfig = {
    region: 'us-east-1',
    secretName: 'test-secret',
  }

  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env['DATABASE_URL']
    delete process.env['API_KEY']
    delete process.env['NODE_ENV']
    delete process.env['AWS_ACCESS_KEY_ID']
    delete process.env['AWS_SECRET_ACCESS_KEY']

    // Reset mocks
    jest.clearAllMocks()
  })

  describe('loadSecrets', () => {
    it('should load secrets successfully', async () => {
      const secrets = await loadSecrets(mockConfig)

      expect(secrets).toEqual({
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        API_KEY: 'test-api-key',
        NODE_ENV: 'test',
      })
    })

    it('should set environment variables', async () => {
      await loadSecrets(mockConfig)

      expect(process.env['DATABASE_URL']).toBe(
        'postgresql://test:test@localhost:5432/test'
      )
      expect(process.env['API_KEY']).toBe('test-api-key')
      expect(process.env['NODE_ENV']).toBe('test')
    })

    it('should load multiple secrets', async () => {
      const multiConfig: SecretConfig = {
        region: 'us-east-1',
        secretName: ['secret1', 'secret2'],
      }

      const secrets = await loadSecrets(multiConfig)
      expect(secrets).toBeDefined()
    })

    it('should load secrets with custom retry configuration', async () => {
      const retryConfig: RetryConfig = {
        maxAttempts: 5,
        delayMs: 2000,
      }

      const secrets = await loadSecrets(mockConfig, retryConfig)
      expect(secrets).toBeDefined()
    })

    it('should load secrets with credentials', async () => {
      const configWithCredentials: SecretConfig = {
        region: 'us-east-1',
        secretName: 'test-secret',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      }

      const secrets = await loadSecrets(configWithCredentials)
      expect(secrets).toBeDefined()
    })

    it('should use environment credentials when available', async () => {
      process.env['AWS_ACCESS_KEY_ID'] = 'env-access-key'
      process.env['AWS_SECRET_ACCESS_KEY'] = 'env-secret-key'

      const secrets = await loadSecrets(mockConfig)
      expect(secrets).toBeDefined()
    })

    it('should skip invalid secret names', async () => {
      const configWithInvalidSecrets: SecretConfig = {
        region: 'us-east-1',
        secretName: ['valid-secret', '', 'another-valid-secret'],
      }

      const secrets = await loadSecrets(configWithInvalidSecrets)
      expect(secrets).toBeDefined()
    })

    it('should throw error for invalid region', async () => {
      const invalidConfig = { ...mockConfig, region: '' }

      await expect(loadSecrets(invalidConfig)).rejects.toThrow(
        'AWS region is required'
      )
    })

    it('should throw error for invalid secret name', async () => {
      const invalidConfig = { ...mockConfig, secretName: '' }

      await expect(loadSecrets(invalidConfig)).rejects.toThrow(
        'Secret name is required'
      )
    })
  })

  describe('isRunningOnAWS', () => {
    it('should return false when not on AWS', () => {
      delete process.env['AWS_EXECUTION_ENV']
      delete process.env['AWS_LAMBDA_FUNCTION_NAME']

      expect(isRunningOnAWS()).toBe(false)
    })

    it('should return true when on AWS Lambda', () => {
      process.env['AWS_LAMBDA_FUNCTION_NAME'] = 'test-function'

      expect(isRunningOnAWS()).toBe(true)
    })

    it('should return true when on AWS execution environment', () => {
      process.env['AWS_EXECUTION_ENV'] = 'AWS_Lambda_Nodejs18.x'

      expect(isRunningOnAWS()).toBe(true)
    })
  })

  describe('getAWSRegion', () => {
    it('should return undefined when no region is set', () => {
      delete process.env['AWS_REGION']
      delete process.env['AWS_DEFAULT_REGION']

      expect(getAWSRegion()).toBeUndefined()
    })

    it('should return AWS_REGION when set', () => {
      process.env['AWS_REGION'] = 'us-east-1'

      expect(getAWSRegion()).toBe('us-east-1')
    })

    it('should return AWS_DEFAULT_REGION when AWS_REGION is not set', () => {
      delete process.env['AWS_REGION']
      process.env['AWS_DEFAULT_REGION'] = 'us-west-2'

      expect(getAWSRegion()).toBe('us-west-2')
    })

    it('should prioritize AWS_REGION over AWS_DEFAULT_REGION', () => {
      process.env['AWS_REGION'] = 'us-east-1'
      process.env['AWS_DEFAULT_REGION'] = 'us-west-2'

      expect(getAWSRegion()).toBe('us-east-1')
    })
  })

  describe('testSavedSecrets', () => {
    it('should log environment variables', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      testSavedSecrets()

      expect(consoleSpy).toHaveBeenCalledWith(process.env, 'SAVED SECRETS')

      consoleSpy.mockRestore()
    })
  })
})
