export interface SlackConfig {
  token: string
  defaultChannel?: string
  botName?: string
  baseUrl?: string
}

export interface SlackMessage {
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

export interface SlackBlock {
  type:
    | 'section'
    | 'divider'
    | 'image'
    | 'actions'
    | 'context'
    | 'input'
    | 'file'
    | 'header'
  text?: SlackText
  elements?: SlackElement[]
  fields?: SlackField[]
  image_url?: string
  alt_text?: string
  block_id?: string
}

export interface SlackText {
  type: 'plain_text' | 'mrkdwn'
  text: string
  emoji?: boolean
  verbatim?: boolean
}

export interface SlackField {
  type: 'plain_text' | 'mrkdwn'
  text: string
}

export interface SlackElement {
  type:
    | 'button'
    | 'select'
    | 'overflow'
    | 'datepicker'
    | 'timepicker'
    | 'datetimepicker'
    | 'plain_text_input'
    | 'radio_buttons'
    | 'checkboxes'
  text?: SlackText
  value?: string
  url?: string
  style?: 'primary' | 'danger'
  action_id?: string
  options?: SlackOption[]
}

export interface SlackOption {
  text: SlackText
  value: string
}

export interface SlackAttachment {
  color?: string
  title?: string
  title_link?: string
  text?: string
  fields?: SlackAttachmentField[]
  image_url?: string
  thumb_url?: string
  ts?: number
}

export interface SlackAttachmentField {
  title: string
  value: string
  short?: boolean
}

export interface SlackResponse {
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

export interface SlackNotificationOptions {
  config: SlackConfig
  retryConfig?: {
    maxAttempts: number
    delayMs: number
  }
  failSilently?: boolean
}

export interface SlackWebhookConfig {
  webhookUrl: string
  defaultChannel?: string
  botName?: string
}

export interface SlackWebhookMessage {
  text: string
  channel?: string
  username?: string
  icon_emoji?: string
  icon_url?: string
  attachments?: SlackAttachment[]
  blocks?: SlackBlock[]
}
