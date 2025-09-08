# 🔧 Configuração de Autenticação - Star Node Stack Helper

## 📋 **Visão Geral**

A biblioteca suporta diferentes métodos de autenticação para conectar ao OpenSearch/Elasticsearch:

1. **Username/Password** - Autenticação básica
2. **AWS SigV4** - Autenticação via AWS IAM
3. **Sem autenticação** - Para desenvolvimento local

## 🚀 **Métodos de Configuração**

### **1. Configuração por Variáveis de Ambiente (Recomendado para Produção)**

Crie um arquivo `.env` ou configure as variáveis de ambiente:

```bash
# OpenSearch Configuration
OPENSEARCH_NODE=https://your-opensearch-cluster.amazonaws.com
OPENSEARCH_USERNAME=your-username
OPENSEARCH_PASSWORD=your-password
AWS_REGION=us-east-1

# Service Configuration
SERVICE_NAME=your-service-name
LOG_LEVEL=info
ENABLE_TRANSACTION_LOGS=true
ENABLE_SYSTEM_LOGS=true
```

**Uso:**

```typescript
import { initializeLogger } from '@starbemtech/star-node-stack-helper'

// Lê automaticamente das variáveis de ambiente
const result = await initializeLogger('my-service', 'production')
```

### **2. Configuração Manual (Recomendado para Exemplos)**

```typescript
import { LoggerFactory } from '@starbemtech/star-node-stack-helper'

const result = await LoggerFactory.initialize({
  opensearch: {
    node: 'https://your-opensearch-cluster.amazonaws.com',
    username: 'your-username',
    password: 'your-password',
    region: 'us-east-1',
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
    sensitiveFields: ['password', 'token', 'secret'],
  },
})
```

### **3. Configuração com AWS SigV4**

Para usar autenticação AWS IAM:

```typescript
import { LoggerFactory } from '@starbemtech/star-node-stack-helper'

const result = await LoggerFactory.initialize({
  opensearch: {
    node: 'https://your-opensearch-cluster.amazonaws.com',
    region: 'us-east-1',
    // Não precisa de username/password para AWS SigV4
  },
  service: {
    name: 'my-service',
    environment: 'production',
  },
  logging: {
    level: 'info',
    enableTransactionLogs: true,
    enableSystemLogs: true,
  },
  authType: 'aws', // Especifica autenticação AWS
})
```

**Variáveis de ambiente para AWS:**

```bash
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
OPENSEARCH_NODE=https://your-opensearch-cluster.amazonaws.com
```

## 🔧 **Configurações por Ambiente**

### **Development (Desenvolvimento)**

```typescript
// Configuração padrão para desenvolvimento
const result = await initializeLogger('my-service', 'development')
// Tenta conectar em: https://localhost:9200 com admin/admin
```

### **Production/Staging**

```typescript
// Lê das variáveis de ambiente
const result = await initializeLogger('my-service', 'production')
// Usa: OPENSEARCH_NODE, OPENSEARCH_USERNAME, OPENSEARCH_PASSWORD
```

## 📝 **Exemplos Práticos**

### **Exemplo 1: Desenvolvimento Local**

```typescript
// Para desenvolvimento, use PinoLogger apenas
const result = await initializeLogger('my-service', 'development')
if (!result.success) {
  console.log('Usando PinoLogger apenas - OpenSearch não disponível')
}
```

### **Exemplo 2: Produção com Username/Password**

```bash
# .env
OPENSEARCH_NODE=https://search-my-cluster-xyz.us-east-1.es.amazonaws.com
OPENSEARCH_USERNAME=my-username
OPENSEARCH_PASSWORD=my-secure-password
AWS_REGION=us-east-1
```

### **Exemplo 3: Produção com AWS IAM**

```bash
# .env
OPENSEARCH_NODE=https://search-my-cluster-xyz.us-east-1.es.amazonaws.com
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

```typescript
const result = await LoggerFactory.initialize({
  opensearch: {
    node: process.env['OPENSEARCH_NODE'],
    region: process.env['AWS_REGION'],
  },
  service: {
    name: 'my-service',
    environment: 'production',
  },
  authType: 'aws',
})
```

## 🛡️ **Segurança**

### **Boas Práticas:**

1. **Nunca** commite credenciais no código
2. Use variáveis de ambiente para produção
3. Use AWS IAM roles quando possível
4. Configure campos sensíveis para serem redactados:
   ```typescript
   sensitiveFields: ['password', 'token', 'secret', 'authorization', 'api_key']
   ```

### **Fallback Seguro:**

A biblioteca sempre inicializa o PinoLogger como fallback, garantindo que os logs sejam capturados mesmo se o OpenSearch falhar.

## 🔍 **Troubleshooting**

### **Erro de Conexão SSL:**

```
write EPROTO C06027F001000000:error:0A00010B:SSL routines:ssl3_get_record:wrong version number
```

**Solução:** Verifique se a URL do OpenSearch está correta e se o certificado SSL é válido.

### **Erro de Autenticação:**

```
Authentication failed
```

**Solução:** Verifique username/password ou credenciais AWS.

### **OpenSearch não disponível:**

A biblioteca automaticamente usa PinoLogger como fallback e continua funcionando normalmente.
