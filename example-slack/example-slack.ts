import {
  sendSlackMessage,
  sendSlackWebhook,
  createSectionBlock,
  createButtonElement,
  createActionBlock,
  createSlackAttachment,
  SlackNotifier,
  type SlackConfig,
  type SlackWebhookConfig,
} from '../src'

// Example 1: Sending a simple message using the official API
async function exemploMensagemSimples() {
  const config: SlackConfig = {
    token: 'xoxb-seu-bot-token-aqui',
    defaultChannel: '#general',
    botName: 'Meu Bot',
  }

  const response = await sendSlackMessage(
    {
      channel: '#general',
      text: 'Olá! Esta é uma mensagem de teste do meu bot.',
      username: 'Meu Bot',
      icon_emoji: ':robot_face:',
    },
    {
      config,
      failSilently: true, // Does not throw if there is an error
    }
  )

  console.log('Resposta:', response)
}

// Example 2: Sending a formatted message with blocks
async function exemploMensagemFormatada() {
  const config: SlackConfig = {
    token: 'your-slack-token',
    defaultChannel: '#your-channel',
  }

  const blocks = [
    createSectionBlock('*🚀 Nova Deploy Realizada!*', { type: 'mrkdwn' }),
    createSectionBlock('Detalhes da deploy:', { type: 'mrkdwn' }),
    createSectionBlock('', {
      fields: [
        { type: 'mrkdwn', text: '*Ambiente:*' },
        { type: 'mrkdwn', text: 'Produção' },
        { type: 'mrkdwn', text: '*Versão:*' },
        { type: 'mrkdwn', text: 'v1.2.3' },
        { type: 'mrkdwn', text: '*Status:*' },
        { type: 'mrkdwn', text: '✅ Sucesso' },
      ],
    }),
    createActionBlock(
      [
        createButtonElement('Ver Logs', 'view_logs', {
          style: 'primary',
          action_id: 'view_logs_btn',
        }),
        createButtonElement('Rollback', 'rollback', {
          style: 'danger',
          action_id: 'rollback_btn',
        }),
      ],
      'deploy_actions'
    ),
  ]

  const response = await sendSlackMessage(
    {
      channel: '#deployments',
      text: 'Nova deploy realizada com sucesso!',
      blocks,
    },
    {
      config,
    }
  )

  console.log('Resposta:', response)
}

exemploMensagemFormatada()

// Example 3: Sending a message via webhook
async function exemploWebhook() {
  const config: SlackWebhookConfig = {
    webhookUrl: 'https://hooks.slack.com/services/SEU/WEBHOOK/URL',
    defaultChannel: '#alerts',
    botName: 'Sistema de Alertas',
  }

  const attachment = createSlackAttachment({
    color: 'danger',
    title: '🚨 Alerta do Sistema',
    text: 'O sistema detectou um problema crítico que requer atenção imediata.',
    fields: [
      { title: 'Serviço', value: 'API Gateway', short: true },
      { title: 'Erro', value: 'Timeout na conexão', short: true },
      { title: 'Timestamp', value: new Date().toISOString(), short: false },
    ],
    ts: Math.floor(Date.now() / 1000),
  })

  const response = await sendSlackWebhook(
    {
      text: 'Alerta crítico do sistema',
      channel: '#alerts',
      attachments: [attachment],
    },
    config,
    {
      failSilently: true,
    }
  )

  console.log('Resposta:', response)
}

// Example 4: Using the SlackNotifier class for easier usage
async function exemploSlackNotifier() {
  const config: SlackConfig = {
    token: 'xoxb-seu-bot-token-aqui',
    defaultChannel: '#notifications',
    botName: 'Sistema de Notificações',
  }

  const notifier = new SlackNotifier(config, {
    failSilently: true,
    retryConfig: {
      maxAttempts: 5,
      delayMs: 2000,
    },
  })

  // Send different types of messages
  await notifier.sendMessage('Mensagem simples de teste')

  await notifier.sendSuccess('Operação realizada com sucesso!')

  await notifier.sendWarning('Atenção: Recursos baixos detectados')

  await notifier.sendError(
    'Erro crítico: Falha na conexão com o banco de dados'
  )

  // Send formatted message
  const customBlocks = [
    createSectionBlock('*📊 Relatório Diário*', { type: 'mrkdwn' }),
    createSectionBlock('Aqui está o resumo das atividades de hoje:'),
    createSectionBlock('', {
      fields: [
        { type: 'mrkdwn', text: '*Usuários Ativos:*' },
        { type: 'mrkdwn', text: '1,234' },
        { type: 'mrkdwn', text: '*Transações:*' },
        { type: 'mrkdwn', text: '5,678' },
        { type: 'mrkdwn', text: '*Receita:*' },
        { type: 'mrkdwn', text: 'R$ 12,345.67' },
      ],
    }),
  ]

  await notifier.sendFormattedMessage(customBlocks, '#reports')
}

// Example 5: Error handling and retry
async function exemploComRetry() {
  const config: SlackConfig = {
    token: 'xoxb-seu-bot-token-aqui',
    defaultChannel: '#errors',
  }

  try {
    const response = await sendSlackMessage(
      {
        channel: '#errors',
        text: 'Esta mensagem será tentada várias vezes em caso de falha',
      },
      {
        config,
        retryConfig: {
          maxAttempts: 3,
          delayMs: 1000,
        },
        failSilently: false, // Will throw if it fails
      }
    )

    console.log('Mensagem enviada com sucesso:', response)
  } catch (error) {
    console.error('Falha ao enviar mensagem após todas as tentativas:', error)
  }
}

// Run examples (uncomment to test)
// exemploMensagemSimples()
// exemploMensagemFormatada()
// exemploWebhook()
// exemploSlackNotifier()
// exemploComRetry()

export {
  exemploMensagemSimples,
  exemploMensagemFormatada,
  exemploWebhook,
  exemploSlackNotifier,
  exemploComRetry,
}
