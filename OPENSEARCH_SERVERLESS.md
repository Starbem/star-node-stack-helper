# 🔧 Configuração para Amazon OpenSearch Serverless

## 📋 **Diferenças do OpenSearch Serverless**

O **Amazon OpenSearch Serverless** (`.aoss.amazonaws.com`) tem algumas diferenças importantes:

### **❌ Limitações:**

- Não suporta método `ping()` tradicional
- Requer autenticação AWS SigV4 obrigatória
- Pode ter políticas de acesso mais restritivas
- Endpoints específicos para diferentes operações

### **✅ Vantagens:**

- Gerenciamento automático de recursos
- Escalabilidade automática
- Menor custo para cargas de trabalho variáveis

## 🔧 **Configuração Correta**

### **1. Configuração Básica**

```typescript
import { LoggerFactory } from '@starbemtech/star-node-stack-helper'

const result = await LoggerFactory.initialize({
  authType: 'aws', // OBRIGATÓRIO para OpenSearch Serverless
  opensearch: {
    node: 'https://your-collection.us-east-2.aoss.amazonaws.com',
    region: 'us-east-2',
  },
  service: {
    name: 'my-service',
    environment: 'production',
    index: 'my-service-logs',
  },
  logging: {
    level: 'info',
    enableTransactionLogs: true,
    enableSystemLogs: true,
  },
})
```

### **2. Variáveis de Ambiente**

```bash
# OpenSearch Serverless Configuration
OPENSEARCH_NODE=https://your-collection.us-east-2.aoss.amazonaws.com
AWS_REGION=us-east-2

# AWS Credentials (automáticas se usando IAM roles)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SESSION_TOKEN=your-session-token  # Se usando STS
```

### **3. Configuração de IAM**

Seu usuário/role AWS precisa das seguintes permissões:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["aoss:APIAccessAll", "aoss:DashboardsAccessAll"],
      "Resource": "arn:aws:aoss:us-east-2:123456789012:collection/your-collection"
    }
  ]
}
```

## 🛠️ **Troubleshooting**

### **Erro: "Ping failed - no response body"**

**Causa:** OpenSearch Serverless não suporta ping tradicional

**Solução:** A biblioteca foi atualizada para detectar automaticamente OpenSearch Serverless e pular o teste de ping.

### **Erro: "Authentication failed"**

**Causa:** Credenciais AWS incorretas ou permissões insuficientes

**Soluções:**

1. Verifique suas credenciais AWS:

   ```bash
   aws sts get-caller-identity
   ```

2. Verifique se tem acesso ao OpenSearch Serverless:

   ```bash
   aws opensearchserverless list-collections
   ```

3. Verifique as políticas de acesso da collection:
   ```bash
   aws opensearchserverless get-access-policy --name your-policy-name
   ```

### **Erro: "Write permission denied"**

**Causa:** Política de acesso não permite escrita no índice

**Solução:** Atualize a política de acesso da collection para incluir permissões de escrita:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/your-user"
      },
      "Action": [
        "aoss:CreateCollectionItems",
        "aoss:DeleteCollectionItems",
        "aoss:UpdateCollectionItems",
        "aoss:DescribeCollectionItems"
      ],
      "Resource": "arn:aws:aoss:us-east-2:123456789012:collection/your-collection"
    }
  ]
}
```

## 🔍 **Verificação de Configuração**

### **1. Teste de Conectividade**

```typescript
import { LoggerFactory } from '@starbemtech/star-node-stack-helper'

const result = await LoggerFactory.initialize({
  authType: 'aws',
  opensearch: {
    node: 'https://your-collection.us-east-2.aoss.amazonaws.com',
    region: 'us-east-2',
  },
  service: {
    name: 'test-service',
    environment: 'development',
  },
})

if (result.success) {
  console.log('✅ Conectado ao OpenSearch Serverless com sucesso!')
} else {
  console.error('❌ Falha na conexão:', result.error)
}
```

### **2. Teste Manual com AWS CLI**

```bash
# Verificar se consegue acessar a collection
aws opensearchserverless batch-get-collection --names your-collection-name

# Verificar políticas de acesso
aws opensearchserverless list-access-policies --type data
```

## 📝 **Exemplo Completo**

```typescript
import {
  LoggerFactory,
  getSystemLogger,
} from '@starbemtech/star-node-stack-helper'

async function setupLogging() {
  try {
    const result = await LoggerFactory.initialize({
      authType: 'aws',
      opensearch: {
        node:
          process.env['OPENSEARCH_NODE'] ||
          'https://your-collection.us-east-2.aoss.amazonaws.com',
        region: process.env['AWS_REGION'] || 'us-east-2',
      },
      service: {
        name: 'my-service',
        environment: process.env['NODE_ENV'] || 'development',
        index: 'my-service-logs',
      },
      logging: {
        level: 'info',
        enableTransactionLogs: true,
        enableSystemLogs: true,
        sensitiveFields: ['password', 'token', 'secret'],
      },
    })

    if (result.success) {
      console.log('✅ OpenSearch Serverless configurado com sucesso!')

      // Teste de log
      const systemLogger = getSystemLogger()
      await systemLogger.info('Sistema inicializado', {
        service: 'my-service',
        timestamp: new Date().toISOString(),
      })
    } else {
      console.error('❌ Falha na configuração:', result.error)
    }
  } catch (error) {
    console.error('❌ Erro na inicialização:', error)
  }
}

setupLogging()
```

## 🚀 **Próximos Passos**

1. **Configure suas credenciais AWS** corretamente
2. **Verifique as permissões IAM** para a collection
3. **Teste a conectividade** com o exemplo acima
4. **Monitore os logs** para identificar problemas específicos

A biblioteca agora está otimizada para funcionar com OpenSearch Serverless! 🎉
