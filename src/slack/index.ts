import {
  SlackConfig,
  SlackMessage,
  SlackResponse,
  SlackNotificationOptions,
  SlackWebhookConfig,
  SlackWebhookMessage,
  SlackBlock,
  SlackElement,
  SlackField,
  SlackAttachment,
  SlackAttachmentField,
} from './types'

const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  delayMs: 1000,
}

/**
 * Provides user-friendly error messages for common Slack API errors.
 *
 * @param {string | undefined} error - The error code from Slack API.
 * @returns {string} A user-friendly error message.
 */
function getSlackErrorMessage(error: string | undefined): string {
  if (!error) return 'Unknown error from Slack API'

  const errorMessages: Record<string, string> = {
    not_in_channel:
      'Bot is not in the channel. Add the bot to the channel or use a public channel.',
    channel_not_found:
      'Channel not found. Verify that the channel name is correct.',
    invalid_auth:
      'Invalid authentication token. Verify that the token is correct.',
    account_inactive: 'Bot account is inactive. Check the bot settings.',
    token_revoked: 'Token has been revoked. Generate a new token.',
    no_permission:
      'Bot does not have permission to send messages to this channel.',
    is_archived: 'Channel is archived and cannot receive messages.',
    msg_too_long: 'Message too long. Reduce the message size.',
    rate_limited: 'Rate limit exceeded. Try again in a few seconds.',
    fatal_error: 'Fatal Slack error. Try again later.',
  }

  return errorMessages[error] || `Slack error: ${error}`
}

/**
 * Checks if the bot is a member of the specified channel.
 *
 * @param {string} channel - The channel name or ID.
 * @param {SlackConfig} config - The Slack configuration.
 * @returns {Promise<boolean>} True if the bot is in the channel, false otherwise.
 */
async function isBotInChannel(
  channel: string,
  config: SlackConfig
): Promise<boolean> {
  try {
    const baseUrl = config.baseUrl || 'https://slack.com/api'
    const response = await fetch(`${baseUrl}/conversations.info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({ channel }),
    })

    if (!response.ok) {
      return false
    }

    const data = (await response.json()) as {
      ok: boolean
      channel?: { is_member?: boolean }
    }
    return data.ok && data.channel?.is_member === true
  } catch {
    return false
  }
}

/**
 * Validates the Slack configuration.
 *
 * @param {SlackConfig} config - The Slack configuration.
 * @returns {void}
 * @throws {Error} If the configuration is invalid.
 */
function validateSlackConfig(config: SlackConfig): void {
  if (!config.token) {
    throw new Error('Slack token is required')
  }

  if (typeof config.token !== 'string') {
    throw new Error('Slack token must be a string')
  }

  if (!config.token.startsWith('xoxb-')) {
    console.warn(
      'Slack token does not appear to be a valid Bot User OAuth Token'
    )
  }
}

/**
 * Validates the Slack webhook configuration.
 *
 * @param {SlackWebhookConfig} config - The webhook configuration.
 * @returns {void}
 * @throws {Error} If the configuration is invalid.
 */
function validateWebhookConfig(config: SlackWebhookConfig): void {
  if (!config.webhookUrl) {
    throw new Error('Slack webhook URL is required')
  }

  if (typeof config.webhookUrl !== 'string') {
    throw new Error('Slack webhook URL must be a string')
  }

  if (!config.webhookUrl.startsWith('https://hooks.slack.com/')) {
    throw new Error(
      'Slack webhook URL must start with https://hooks.slack.com/'
    )
  }
}

/**
 * Validates a Slack message.
 *
 * @param {SlackMessage} message - The message to validate.
 * @returns {void}
 * @throws {Error} If the message is invalid.
 */
function validateSlackMessage(message: SlackMessage): void {
  if (!message.channel) {
    throw new Error('Channel is required')
  }

  if (!message.text && !message.blocks && !message.attachments) {
    throw new Error('Message must contain text, blocks, or attachments')
  }
}

/**
 * Waits for a given number of milliseconds.
 *
 * @param {number} ms - Number of milliseconds to wait.
 * @returns {Promise<void>} Promise that resolves after the delay.
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Executes an operation with retry and exponential backoff.
 *
 * @param {() => Promise<T>} operation - The operation to execute.
 * @param {object} retryConfig - Retry configuration.
 * @returns {Promise<T>} Result of the operation.
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === retryConfig.maxAttempts) {
        throw lastError
      }

      const delayTime = retryConfig.delayMs * Math.pow(2, attempt - 1)
      console.warn(
        `Attempt ${attempt} failed, retrying in ${delayTime}ms:`,
        lastError.message
      )
      await delay(delayTime)
    }
  }

  throw lastError!
}

/**
 * Sends a message to Slack using the official API.
 *
 * @param {SlackMessage} message - The message to send.
 * @param {SlackNotificationOptions} options - Notification options.
 * @returns {Promise<SlackResponse>} Slack API response.
 *
 * @example
 * ```typescript
 * const response = await sendSlackMessage({
 *   channel: '#general',
 *   text: 'Hello, this is a notification!',
 *   username: 'My Bot'
 * }, {
 *   config: {
 *     token: 'xoxb-your-bot-token',
 *     defaultChannel: '#general'
 *   }
 * })
 * ```
 */
export async function sendSlackMessage(
  message: SlackMessage,
  options: SlackNotificationOptions
): Promise<SlackResponse> {
  validateSlackConfig(options.config)
  validateSlackMessage(message)

  // Check if bot is in the channel (optional check)
  if (options.checkChannelMembership !== false) {
    const isInChannel = await isBotInChannel(message.channel, options.config)
    if (!isInChannel) {
      const errorMessage = `Bot is not in the channel ${message.channel}. Add the bot to the channel or use a public channel.`
      console.warn(errorMessage)

      if (!options.failSilently) {
        throw new Error(errorMessage)
      }

      return {
        ok: false,
        error: errorMessage,
      }
    }
  }

  const retryConfig = options.retryConfig || DEFAULT_RETRY_CONFIG
  const baseUrl = options.config.baseUrl || 'https://slack.com/api'

  const payload = {
    channel: message.channel,
    text: message.text,
    ...(message.blocks && { blocks: message.blocks }),
    ...(message.attachments && { attachments: message.attachments }),
    ...(message.username && { username: message.username }),
    ...(message.icon_emoji && { icon_emoji: message.icon_emoji }),
    ...(message.icon_url && { icon_url: message.icon_url }),
    ...(message.thread_ts && { thread_ts: message.thread_ts }),
    ...(message.replace_original && {
      replace_original: message.replace_original,
    }),
    ...(message.delete_original && {
      delete_original: message.delete_original,
    }),
  }

  try {
    const response = await retryWithBackoff(async () => {
      const res = await fetch(`${baseUrl}/chat.postMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.config.token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = (await res.json()) as SlackResponse

      if (!data.ok) {
        const errorMessage = getSlackErrorMessage(data.error)
        throw new Error(errorMessage)
      }

      return data
    }, retryConfig)

    console.log(`Message sent successfully to channel ${message.channel}`)
    return response
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error sending message to Slack: ${errorMessage}`)

    if (!options.failSilently) {
      throw error
    }

    return {
      ok: false,
      error: errorMessage,
    }
  }
}

/**
 * Sends a message to Slack using a webhook.
 *
 * @param {SlackWebhookMessage} message - The message to send.
 * @param {SlackWebhookConfig} config - Webhook configuration.
 * @param {object} options - Additional options.
 * @returns {Promise<SlackResponse>} Webhook response.
 *
 * @example
 * ```typescript
 * const response = await sendSlackWebhook({
 *   text: 'Hello, this is a notification via webhook!',
 *   channel: '#general'
 * }, {
 *   webhookUrl: 'https://hooks.slack.com/services/...',
 *   botName: 'My Bot'
 * })
 * ```
 */
export async function sendSlackWebhook(
  message: SlackWebhookMessage,
  config: SlackWebhookConfig,
  options: {
    failSilently?: boolean
    retryConfig?: { maxAttempts: number; delayMs: number }
  } = {}
): Promise<SlackResponse> {
  validateWebhookConfig(config)

  if (!message.text && !message.blocks && !message.attachments) {
    throw new Error('Message must contain text, blocks, or attachments')
  }

  const retryConfig = options.retryConfig || DEFAULT_RETRY_CONFIG

  const payload = {
    text: message.text,
    ...(message.channel && { channel: message.channel }),
    ...(message.username && { username: message.username }),
    ...(message.icon_emoji && { icon_emoji: message.icon_emoji }),
    ...(message.icon_url && { icon_url: message.icon_url }),
    ...(message.attachments && { attachments: message.attachments }),
    ...(message.blocks && { blocks: message.blocks }),
  }

  try {
    const response = await retryWithBackoff(async () => {
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const responseText = await res.text()

      if (responseText !== 'ok') {
        throw new Error(`Webhook returned: ${responseText}`)
      }

      return {
        ok: true,
        channel: message.channel || config.defaultChannel || '#general',
      }
    }, retryConfig)

    console.log(
      `Message sent successfully via webhook to channel ${message.channel || config.defaultChannel}`
    )
    return response
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error sending message via Slack webhook: ${errorMessage}`)

    if (!options.failSilently) {
      throw error
    }

    return {
      ok: false,
      error: errorMessage,
    }
  }
}

/**
 * Removes control characters from text.
 *
 * @param {string} text - Text to clean.
 * @returns {string} Cleaned text.
 */
function removeControlCharacters(text: string): string {
  return text
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0)
      return code >= 32 && code !== 127
    })
    .join('')
}

/**
 * Validates and sanitizes text for Slack blocks.
 *
 * @param {string} text - Text to validate.
 * @param {string} type - Text type ('plain_text' or 'mrkdwn').
 * @returns {string} Sanitized text.
 */
function validateAndSanitizeText(
  text: string,
  type: 'plain_text' | 'mrkdwn'
): string {
  if (!text || text.trim() === '') {
    return type === 'mrkdwn' ? ' ' : ' '
  }

  // Remove or replace problematic characters
  let sanitized = removeControlCharacters(text)
    .replace(/\uFEFF/g, '')
    .trim()

  // For mrkdwn, ensure proper escaping
  if (type === 'mrkdwn') {
    // Escape special characters that could break mrkdwn
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  // Truncate if too long (Slack limit is 3000 characters for section text)
  const maxLength = 3000
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...'
  }

  return sanitized || ' '
}

/**
 * Validates a Slack block structure.
 *
 * @param {SlackBlock} block - Block to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
function validateSlackBlock(block: SlackBlock): boolean {
  if (!block || typeof block !== 'object') {
    return false
  }

  if (!block.type || typeof block.type !== 'string') {
    return false
  }

  // For section blocks, validate text
  if (block.type === 'section' && block.text) {
    if (!block.text.type || !block.text.text) {
      return false
    }

    const textLength = block.text.text.length
    if (textLength === 0 || textLength > 3000) {
      return false
    }
  }

  return true
}

/**
 * Creates a section block for formatted Slack messages.
 *
 * @param {string} text - Block text.
 * @param {object} options - Additional options.
 * @returns {SlackBlock} Section block.
 *
 * @example
 * ```typescript
 * const block = createSectionBlock('*Bold text*', { type: 'mrkdwn' })
 * ```
 */
export function createSectionBlock(
  text: string,
  options: { type?: 'plain_text' | 'mrkdwn'; fields?: SlackField[] } = {}
): SlackBlock {
  const textType = options.type || 'mrkdwn'
  const sanitizedText = validateAndSanitizeText(text, textType)

  return {
    type: 'section',
    text: {
      type: textType,
      text: sanitizedText,
    },
    ...(options.fields && { fields: options.fields }),
  }
}

/**
 * Creates a divider block for visual separation.
 *
 * @returns {SlackBlock} Divider block.
 *
 * @example
 * ```typescript
 * const divider = createDividerBlock()
 * ```
 */
export function createDividerBlock(): SlackBlock {
  return {
    type: 'divider',
  }
}

/**
 * Creates a button block for interactive Slack messages.
 *
 * @param {string} text - Button text.
 * @param {string} value - Button value.
 * @param {object} options - Additional options.
 * @returns {SlackElement} Button element.
 *
 * @example
 * ```typescript
 * const button = createButtonElement('Click here', 'button_clicked', { style: 'primary' })
 * ```
 */
export function createButtonElement(
  text: string,
  value: string,
  options: {
    style?: 'primary' | 'danger'
    url?: string
    action_id?: string
  } = {}
): SlackElement {
  return {
    type: 'button',
    text: {
      type: 'plain_text',
      text,
    },
    value,
    ...(options.style && { style: options.style }),
    ...(options.url && { url: options.url }),
    ...(options.action_id && { action_id: options.action_id }),
  }
}

/**
 * Creates an actions block with buttons.
 *
 * @param {SlackElement[]} elements - Block elements.
 * @param {string} blockId - Block ID (optional).
 * @returns {SlackBlock} Actions block.
 *
 * @example
 * ```typescript
 * const actionBlock = createActionBlock([
 *   createButtonElement('Approve', 'approve', { style: 'primary' }),
 *   createButtonElement('Reject', 'reject', { style: 'danger' })
 * ])
 * ```
 */
export function createActionBlock(
  elements: SlackElement[],
  blockId?: string
): SlackBlock {
  return {
    type: 'actions',
    elements,
    ...(blockId && { block_id: blockId }),
  }
}

/**
 * Creates an attachment for Slack messages.
 *
 * @param {object} options - Attachment options.
 * @returns {SlackAttachment} Slack attachment.
 *
 * @example
 * ```typescript
 * const attachment = createSlackAttachment({
 *   color: 'good',
 *   title: 'Attachment title',
 *   text: 'Attachment text',
 *   fields: [
 *     { title: 'Field 1', value: 'Value 1', short: true },
 *     { title: 'Field 2', value: 'Value 2', short: true }
 *   ]
 * })
 * ```
 */
export function createSlackAttachment(options: {
  color?: string
  title?: string
  title_link?: string
  text?: string
  fields?: SlackAttachmentField[]
  image_url?: string
  thumb_url?: string
  ts?: number
}): SlackAttachment {
  return {
    ...options,
  }
}

/**
 * Class to conveniently manage Slack notifications.
 */
export class SlackNotifier {
  private config: SlackConfig
  private retryConfig: { maxAttempts: number; delayMs: number }
  private failSilently: boolean

  constructor(
    config: SlackConfig,
    options: {
      retryConfig?: { maxAttempts: number; delayMs: number }
      failSilently?: boolean
    } = {}
  ) {
    validateSlackConfig(config)
    this.config = config
    this.retryConfig = options.retryConfig || DEFAULT_RETRY_CONFIG
    this.failSilently = options.failSilently || false
  }

  /**
   * Sends a simple message.
   *
   * @param {string} text - Message text.
   * @param {string} channel - Channel (optional, uses default if not specified).
   * @returns {Promise<SlackResponse>} API response.
   */
  async sendMessage(text: string, channel?: string): Promise<SlackResponse> {
    return sendSlackMessage(
      {
        channel: channel || this.config.defaultChannel || '#general',
        text,
        ...(this.config.botName && { username: this.config.botName }),
      },
      {
        config: this.config,
        retryConfig: this.retryConfig,
        failSilently: this.failSilently,
      }
    )
  }

  /**
   * Sends a formatted message with blocks.
   *
   * @param {SlackBlock[]} blocks - Message blocks.
   * @param {string} channel - Channel (optional, uses default if not specified).
   * @param {string} fallbackText - Fallback text (optional).
   * @returns {Promise<SlackResponse>} API response.
   */
  async sendFormattedMessage(
    blocks: SlackBlock[],
    channel?: string,
    fallbackText?: string
  ): Promise<SlackResponse> {
    // Validate and filter blocks
    const validBlocks = blocks.filter((block) => {
      const isValid = validateSlackBlock(block)
      if (!isValid) {
        console.warn(
          'Invalid block filtered out:',
          JSON.stringify(block, null, 2)
        )
      }
      return isValid
    })

    // If no valid blocks remain, send a simple text message instead
    if (validBlocks.length === 0) {
      console.warn('No valid blocks found, sending fallback text message')
      return this.sendMessage(
        fallbackText || 'Formatted message (blocks were invalid)',
        channel
      )
    }

    return sendSlackMessage(
      {
        channel: channel || this.config.defaultChannel || '#general',
        text: fallbackText || 'Formatted message',
        blocks: validBlocks,
        ...(this.config.botName && { username: this.config.botName }),
      },
      {
        config: this.config,
        retryConfig: this.retryConfig,
        failSilently: this.failSilently,
      }
    )
  }

  /**
   * Sends an error message.
   *
   * @param {string} error - Error message.
   * @param {string} channel - Channel (optional, uses default if not specified).
   * @returns {Promise<SlackResponse>} API response.
   */
  async sendError(error: string, channel?: string): Promise<SlackResponse> {
    return this.sendFormattedMessage(
      [
        createSectionBlock('🚨 *Error*', { type: 'mrkdwn' }),
        createSectionBlock(error),
      ],
      channel,
      `Error: ${error}`
    )
  }

  /**
   * Sends a success message.
   *
   * @param {string} message - Success message.
   * @param {string} channel - Channel (optional, uses default if not specified).
   * @returns {Promise<SlackResponse>} API response.
   */
  async sendSuccess(message: string, channel?: string): Promise<SlackResponse> {
    return this.sendFormattedMessage(
      [
        createSectionBlock('✅ *Success*', { type: 'mrkdwn' }),
        createSectionBlock(message),
      ],
      channel,
      `Success: ${message}`
    )
  }

  /**
   * Sends a warning message.
   *
   * @param {string} warning - Warning message.
   * @param {string} channel - Channel (optional, uses default if not specified).
   * @returns {Promise<SlackResponse>} API response.
   */
  async sendWarning(warning: string, channel?: string): Promise<SlackResponse> {
    return this.sendFormattedMessage(
      [
        createSectionBlock('⚠️ *Warning*', { type: 'mrkdwn' }),
        createSectionBlock(warning),
      ],
      channel,
      `Warning: ${warning}`
    )
  }
}
