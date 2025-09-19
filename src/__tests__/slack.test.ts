import {
  sendSlackMessage,
  sendSlackWebhook,
  createSectionBlock,
  createButtonElement,
  createActionBlock,
  createSlackAttachment,
  SlackNotifier,
} from '../slack'
import type {
  SlackConfig,
  SlackMessage,
  SlackWebhookConfig,
  SlackWebhookMessage,
} from '../slack/types'

// Mock fetch
global.fetch = jest.fn()

describe('Slack Module', () => {
  const mockSlackConfig: SlackConfig = {
    token: 'xoxb-test-token',
    defaultChannel: '#test',
    botName: 'Test Bot',
  }

  const mockWebhookConfig: SlackWebhookConfig = {
    webhookUrl: 'https://hooks.slack.com/services/test/webhook/url',
    defaultChannel: '#test',
    botName: 'Test Bot',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendSlackMessage', () => {
    it('should send a simple message successfully', async () => {
      const mockResponse = {
        ok: true,
        channel: '#test',
        ts: '1234567890.123456',
        message: {
          text: 'Test message',
          user: 'U123456',
          ts: '1234567890.123456',
          type: 'message',
        },
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const message: SlackMessage = {
        channel: '#test',
        text: 'Test message',
      }

      const result = await sendSlackMessage(message, {
        config: mockSlackConfig,
      })

      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer xoxb-test-token',
          },
          body: JSON.stringify({
            channel: '#test',
            text: 'Test message',
          }),
        })
      )
    })

    it('should fail with invalid config', async () => {
      const message: SlackMessage = {
        channel: '#test',
        text: 'Test message',
      }

      await expect(
        sendSlackMessage(message, {
          config: { token: '' } as SlackConfig,
        })
      ).rejects.toThrow('Slack token is required')
    })

    it('should fail with invalid message', async () => {
      const message: SlackMessage = {
        channel: '#test',
        text: '',
      }

      await expect(
        sendSlackMessage(message, {
          config: mockSlackConfig,
        })
      ).rejects.toThrow('Message must contain text, blocks, or attachments')
    })
  })

  describe('sendSlackWebhook', () => {
    it('should send a message via webhook successfully', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'ok',
      })

      const message: SlackWebhookMessage = {
        text: 'Test webhook message',
        channel: '#test',
      }

      const result = await sendSlackWebhook(message, mockWebhookConfig)

      expect(result.ok).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        mockWebhookConfig.webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: 'Test webhook message',
            channel: '#test',
          }),
        })
      )
    })

    it('should fail with invalid webhook URL', async () => {
      const message: SlackWebhookMessage = {
        text: 'Test message',
      }

      await expect(
        sendSlackWebhook(message, {
          webhookUrl: 'invalid-url',
        } as SlackWebhookConfig)
      ).rejects.toThrow(
        'Slack webhook URL must start with https://hooks.slack.com/'
      )
    })
  })

  describe('createSectionBlock', () => {
    it('should create a section block with text', () => {
      const block = createSectionBlock('Test text')

      expect(block).toEqual({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Test text',
        },
      })
    })

    it('should create a section block with specific type', () => {
      const block = createSectionBlock('Test text', { type: 'plain_text' })

      expect(block).toEqual({
        type: 'section',
        text: {
          type: 'plain_text',
          text: 'Test text',
        },
      })
    })
  })

  describe('createButtonElement', () => {
    it('should create a button element', () => {
      const button = createButtonElement('Click me', 'button_value')

      expect(button).toEqual({
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Click me',
        },
        value: 'button_value',
      })
    })

    it('should create a button element with style', () => {
      const button = createButtonElement('Click me', 'button_value', {
        style: 'primary',
      })

      expect(button).toEqual({
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Click me',
        },
        value: 'button_value',
        style: 'primary',
      })
    })
  })

  describe('createActionBlock', () => {
    it('should create an actions block', () => {
      const button1 = createButtonElement('Button 1', 'value1')
      const button2 = createButtonElement('Button 2', 'value2')
      const actionBlock = createActionBlock([button1, button2])

      expect(actionBlock).toEqual({
        type: 'actions',
        elements: [button1, button2],
      })
    })
  })

  describe('createSlackAttachment', () => {
    it('should create a Slack attachment', () => {
      const attachment = createSlackAttachment({
        color: 'good',
        title: 'Test Title',
        text: 'Test text',
      })

      expect(attachment).toEqual({
        color: 'good',
        title: 'Test Title',
        text: 'Test text',
      })
    })
  })

  describe('SlackNotifier', () => {
    let notifier: SlackNotifier

    beforeEach(() => {
      notifier = new SlackNotifier(mockSlackConfig)
    })

    it('should send a simple message', async () => {
      const mockResponse = {
        ok: true,
        channel: '#test',
        ts: '1234567890.123456',
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await notifier.sendMessage('Test message')

      expect(result).toEqual(mockResponse)
    })

    it('should send an error message', async () => {
      const mockResponse = {
        ok: true,
        channel: '#test',
        ts: '1234567890.123456',
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await notifier.sendError('Test error')

      expect(result).toEqual(mockResponse)
    })

    it('should send a success message', async () => {
      const mockResponse = {
        ok: true,
        channel: '#test',
        ts: '1234567890.123456',
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await notifier.sendSuccess('Test success')

      expect(result).toEqual(mockResponse)
    })

    it('should send a warning message', async () => {
      const mockResponse = {
        ok: true,
        channel: '#test',
        ts: '1234567890.123456',
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await notifier.sendWarning('Test warning')

      expect(result).toEqual(mockResponse)
    })
  })
})
