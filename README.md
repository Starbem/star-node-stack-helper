# @starbemtech/star-node-stack-helper — Logging

Logging estruturado JSON para APIs Node.js (NestJS, Express, Fastify) integrado com Datadog Agent no EKS.

## Sumário

- [Como funciona](#como-funciona)
- [Instalação](#instalacao)
- [Regra crítica: dd-trace antes do Pino](#regra-critica-dd-trace-antes-do-pino)
- [NestJS](#nestjs)
- [Express](#express)
- [Fastify](#fastify)
- [Logar dentro de services e handlers](#logar-dentro-de-services-e-handlers)
- [Modos de correlação com traces](#modos-de-correlacao-com-traces)
- [Configuração completa](#configuracao-completa)
- [Env vars no Kubernetes](#env-vars-no-kubernetes)
- [Checklist de validação](#checklist-de-validacao)
- [Troubleshooting](#troubleshooting)
- [Referência da API](#referencia-da-api)

---

## Como funciona

```
API (NestJS / Express / Fastify)
  └── createPinoLogger → stdout JSON (uma linha por registro)
        ├── message   — texto do log
        ├── level     — info | warn | error | debug | trace | fatal
        ├── time      — ISO 8601
        ├── service   — DD_SERVICE → SERVICE_NAME → 'app'
        ├── env       — DD_ENV → NODE_ENV → 'development'
        ├── version   — DD_VERSION (omitido quando não definido)
        └── dd.trace_id / dd.span_id  (quando correlationMode: 'datadog')

Datadog Agent (containerCollectAll: true)
  └── coleta stdout → Log Explorer + correlação com APM
```

Exemplo de saída JSON em produção:

```json
{
  "level": "info",
  "time": "2025-04-15T14:32:01.123Z",
  "service": "partner-service",
  "env": "production",
  "version": "1.4.2",
  "message": "User created successfully",
  "userId": "usr_abc123",
  "dd": {
    "trace_id": "8765432198765432",
    "span_id": "1234567812345678",
    "service": "partner-service",
    "env": "production",
    "version": "1.4.2"
  }
}
```

---

## Instalação

```bash
pnpm add @starbemtech/star-node-stack-helper pino pino-http
```

Para correlação com APM Datadog:

```bash
pnpm add dd-trace
```

Para desenvolvimento local com formatação colorida (opcional):

```bash
pnpm add -D pino-pretty
```

---

## Regra crítica: dd-trace antes do Pino

Para que `dd.trace_id` e `dd.span_id` apareçam nos logs, o `dd-trace` **deve ser inicializado antes de qualquer import de `pino`** — inclusive o import desta lib.

Crie um arquivo dedicado e importe-o como **primeira linha** do entrypoint:

```typescript
// src/tracing.ts
import ddTrace from 'dd-trace'

ddTrace.init({
  // DD_SERVICE, DD_ENV, DD_VERSION lidos das env vars automaticamente
  logInjection: false,   // a lib cuida da injeção via mixin (correlationMode: 'datadog')
  runtimeMetrics: true,
})
```

```typescript
// src/main.ts ou src/server.ts
import './tracing'   // ← SEMPRE A PRIMEIRA LINHA

// a partir daqui: qualquer import de pino ou da lib
import { createPinoLogger } from '@starbemtech/star-node-stack-helper'
```

Se não usar `dd-trace`, simplesmente não crie o `tracing.ts` e omita o import.

---

## NestJS

### Bootstrap (main.ts)

```typescript
// src/main.ts
import './tracing'   // ← PRIMEIRO, antes de tudo

import { NestFactory } from '@nestjs/core'
import {
  createPinoLogger,
  createNestPinoLoggerService,
} from '@starbemtech/star-node-stack-helper'
import { AppModule } from './app.module'

async function bootstrap() {
  const rootLogger = createPinoLogger({
    correlationMode: 'datadog',   // injeta dd.trace_id / dd.span_id em cada log
    // serviceName: 'my-api'     // opcional — padrão: DD_SERVICE ou SERVICE_NAME
    // logLevel: 'info'          // opcional — padrão: 'info'
  })

  const logger = createNestPinoLoggerService(rootLogger, 'Bootstrap')

  const app = await NestFactory.create(AppModule, { logger })

  await app.listen(3000, () => {
    logger.log('API running on port 3000', 'Bootstrap')
  })
}
bootstrap()
```

Todos os logs internos do NestJS (bootstrap, rotas, módulos) passam pelo Pino e saem como JSON estruturado.

### Interceptor de request/response com Pino

Para registrar requests/responses com o mesmo formato JSON (incluindo `dd.trace_id`):

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR, APP_FILTER, Reflector } from '@nestjs/core'
import {
  createPinoLogger,
  createPinoLogWriter,
  LogInterceptor,
  LogExceptionFilter,
} from '@starbemtech/star-node-stack-helper'

const rootLogger = createPinoLogger({ correlationMode: 'datadog' })

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) =>
        new LogInterceptor(reflector, {
          logWriter: createPinoLogWriter(rootLogger, 'HTTP'),
          skipResponseLogging: true,  // evita duplicação com acesso HTTP
        }),
      inject: [Reflector],
    },
    {
      provide: APP_FILTER,
      useValue: new LogExceptionFilter({
        logWriter: createPinoLogWriter(rootLogger, 'ExceptionFilter'),
      }),
    },
  ],
})
export class AppModule {}
```

> Quando `logWriter` é omitido, o `LogInterceptor` e o `LogExceptionFilter` continuam funcionando com o `Logger` nativo do NestJS (retrocompatível).

### Usar o logger diretamente em services e controllers

```typescript
// src/users/users.service.ts
import { Injectable } from '@nestjs/common'
import {
  createPinoLogger,
  createPinoLogWriter,
  LogWriter,
} from '@starbemtech/star-node-stack-helper'

// Opção A: injetar via DI (recomendado)
@Injectable()
export class UsersService {
  constructor(
    @Inject('LOG_WRITER') private readonly log: LogWriter,
  ) {}

  async createUser(data: CreateUserDto) {
    this.log.info('Creating user', { email: data.email })

    try {
      const user = await this.db.create(data)
      this.log.info('User created', { userId: user.id })
      return user
    } catch (error) {
      this.log.error('Failed to create user', {
        email: data.email,
        error: error.message,
      })
      throw error
    }
  }
}
```

Provendo o `LogWriter` via DI no `AppModule`:

```typescript
const rootLogger = createPinoLogger({ correlationMode: 'datadog' })

@Module({
  providers: [
    {
      provide: 'LOG_WRITER',
      useValue: createPinoLogWriter(rootLogger),
    },
  ],
})
export class AppModule {}
```

---

## Express

```typescript
// src/server.ts
import './tracing'   // ← PRIMEIRO

import express from 'express'
import {
  createPinoLogger,
  createHttpLogger,
  pinoLogContext,
} from '@starbemtech/star-node-stack-helper'

const app = express()

const logger = createPinoLogger({
  correlationMode: 'datadog',
})

// Middleware de HTTP access log
// Silencia automaticamente: /healthz, /health, /ready, /live, /ping, /metrics
app.use(createHttpLogger(logger))

// Usar em handlers
app.get('/users', async (req, res) => {
  logger.info({ userId: req.user?.id }, 'Fetching users')

  try {
    const users = await getUsers()
    logger.info({ count: users.length }, 'Users fetched')
    res.json(users)
  } catch (error) {
    logger.error(
      pinoLogContext.error(error, { operation: 'getUsers' }),
      'Failed to fetch users',
    )
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(3000, () => {
  logger.info('Server started on port 3000')
})
```

### Silenciar rotas customizadas

```typescript
// Adicionar rotas ao silêncio (além das built-in)
app.use(
  createHttpLogger(logger, {
    customSilentRoutes: ['/internal/ready', '/probe'],
  }),
)
```

O matching é por **pathname**, então `/connect/healthz` também é silenciado quando `/healthz` está na lista.

---

## Fastify

```typescript
// src/server.ts
import './tracing'   // ← PRIMEIRO

import Fastify from 'fastify'
import {
  createPinoLogger,
  buildFastifyLoggerOptions,
} from '@starbemtech/star-node-stack-helper'

const logger = createPinoLogger({
  correlationMode: 'datadog',
})

// Fastify usa o logger Pino diretamente — cada request recebe um child logger
const app = Fastify(buildFastifyLoggerOptions(logger))

app.get('/users', async (request, reply) => {
  // request.log é um child do rootLogger, já com req.id bound
  request.log.info({ userId: '123' }, 'Fetching users')

  const users = await getUsers()
  return users
})

app.listen({ port: 3000 }, () => {
  logger.info('Server started on port 3000')
})
```

### Desabilitar access log automático do Fastify

Se preferir controlar o access log via hook:

```typescript
import { buildFastifyLoggerOptionsQuiet } from '@starbemtech/star-node-stack-helper'

const app = Fastify(buildFastifyLoggerOptionsQuiet(logger))

app.addHook('onResponse', (request, reply, done) => {
  // acesso custom aqui
  done()
})
```

---

## Logar dentro de services e handlers

### Pino nativo (Express / Fastify)

A instância retornada por `createPinoLogger` é um `pino.Logger` padrão.

```typescript
// Logar com dados estruturados
logger.info({ userId: 'u123', action: 'purchase' }, 'Purchase completed')
logger.warn({ orderId: 'o456', reason: 'low_stock' }, 'Stock alert')
logger.error({ error: err.message, stack: err.stack }, 'Payment failed')
logger.debug({ query: sql, params }, 'DB query executed')

// Child logger por contexto (herda todos os campos base + dd.*)
const userLogger = logger.child({ module: 'UsersService' })
userLogger.info({ userId: '123' }, 'Processing user')
```

### pinoLogContext — helpers de contexto

```typescript
import { pinoLogContext } from '@starbemtech/star-node-stack-helper'

// Contexto de request (Express)
logger.info(pinoLogContext.request(req, { userId: req.user.id }), 'Request received')

// Contexto de erro
logger.error(pinoLogContext.error(error, { operation: 'createUser' }), 'Operation failed')

// Contexto de performance
const start = Date.now()
await doSomething()
logger.info(pinoLogContext.performance('processPayment', Date.now() - start), 'Done')

// Contexto de proxy / chamada externa
logger.info(pinoLogContext.proxy('https://api.external.com', 'ExternalService'), 'Proxy request')
```

---

## Modos de correlação com traces

O campo `correlationMode` controla como `dd.trace_id` e `dd.span_id` são injetados:

| Valor | Comportamento | Peer dep necessária |
|-------|--------------|---------------------|
| `'datadog'` | Injeta `dd.trace_id` / `dd.span_id` via mixin na chamada do span ativo do `dd-trace` | `dd-trace` |
| `'otel'` | Injeta `trace_id` / `span_id` do span ativo do `@opentelemetry/api` | `@opentelemetry/api` |
| `'none'` | Sem injeção pela lib. Depende de `DD_LOGS_INJECTION=true` no `ddTrace.init()` | — |

Quando a peer dep não está instalada ou não há span ativo, a lib retorna `{}` silenciosamente — nenhum erro é lançado.

```typescript
// Datadog APM
const logger = createPinoLogger({ correlationMode: 'datadog' })

// OpenTelemetry
const logger = createPinoLogger({ correlationMode: 'otel' })

// Sem correlação (logs puros)
const logger = createPinoLogger({ correlationMode: 'none' })
// ou simplesmente omitir o campo (padrão é 'none')
const logger = createPinoLogger({})
```

---

## Configuração completa

```typescript
import { createPinoLogger, PinoLoggerConfig } from '@starbemtech/star-node-stack-helper'

const logger = createPinoLogger({
  // Identidade do serviço
  serviceName: 'partner-service',      // padrão: DD_SERVICE → SERVICE_NAME → 'app'
  environment: 'production',           // padrão: DD_ENV → NODE_ENV → 'development'

  // Nível mínimo de log
  logLevel: 'info',                    // padrão: 'info'

  // Correlação de traces
  correlationMode: 'datadog',          // padrão: 'none'

  // Rotas silenciadas no HTTP access log (além das built-in)
  customSilentRoutes: ['/probe', '/internal/ready'],

  // Campos extras a redactar em staging/production (além dos padrão)
  customRedactPaths: ['req.body.cpf', 'req.body.card_number'],

  // Formatters customizados (raramente necessário)
  customFormatters: {
    level: (label) => ({ level: label, severity: label.toUpperCase() }),
  },

  // Serializers customizados (raramente necessário)
  customSerializers: {
    req: (req: any) => ({ method: req.method, url: req.url }),
  },
})
```

### Campos sempre redactados em staging/production

Os seguintes campos são removidos automaticamente do JSON de saída:

- `req.headers.authorization`
- `req.headers.cookie`
- `req.body.password`
- `req.body.token`
- `req.body.secret`
- `res.headers["set-cookie"]`

---

## Env vars no Kubernetes

Adicionar nas env vars do deployment (`.k8s/deploy-{env}.tpl.yml`):

```yaml
env:
  - name: DD_SERVICE
    value: 'partner-service'       # define service em todos os logs
  - name: DD_ENV
    value: 'production'            # define env em todos os logs
  - name: DD_VERSION
    value: '${VERSION}'            # define version em todos os logs
  - name: NODE_ENV
    value: 'production'            # usado como fallback para environment
```

E no ConfigMap (`.k8s/config.tpl.yml`):

```yaml
data:
  DD_SERVICE: partner-service
  LOG_LEVEL: info
```

Quando `DD_SERVICE`, `DD_ENV` e `DD_VERSION` estão definidos, o `createPinoLogger` não precisa de nenhuma configuração explícita:

```typescript
// Suficiente quando as env vars estão corretas no pod
const logger = createPinoLogger({ correlationMode: 'datadog' })
```

---

## Checklist de validação

Após o deploy, verificar no Datadog Log Explorer:

- [ ] Logs aparecem em formato JSON (primeiro caractere `{`)
- [ ] Campo `message` presente (não `msg`)
- [ ] Campo `service` bate com a tag `tags.datadoghq.com/service` do pod
- [ ] Campo `env` bate com o ambiente do cluster
- [ ] Campo `version` presente (requer `DD_VERSION` no pod)
- [ ] Em requests com span ativo, `dd.trace_id` está presente no JSON
- [ ] No APM → Trace → aba "Logs", os logs do request aparecem correlacionados
- [ ] Rotas de health check não aparecem no Log Explorer
- [ ] Campos sensíveis (`authorization`, `password`, `token`) aparecem como `[REDACTED]`

---

## Troubleshooting

### `dd.trace_id` não aparece nos logs

1. Confirmar que `import './tracing'` é a **primeira linha** do entrypoint
2. Confirmar que `correlationMode: 'datadog'` está em `createPinoLogger`
3. Confirmar que `dd-trace` está instalado: `pnpm ls dd-trace`
4. O campo só aparece quando há um span ativo — apenas durante requests HTTP instrumentados

### Logs aparecem como texto, não como JSON

- Em `development`/`local`, a lib usa `pino-pretty` automaticamente se disponível
- Em `staging`/`production`, a saída é sempre JSON compacto
- Garantir que `NODE_ENV=production` (ou `DD_ENV=production`) está definido no pod

### Rota `/healthz` ainda aparece nos logs

Verificar se a app usa prefixo global (ex.: `/connect/healthz`). O match é por `endsWith`, então `/healthz` como sufixo é capturado. Se o path for completamente diferente, adicionar via `customSilentRoutes`.

### Logs duplicados (Nest Logger + HTTP access log)

Quando se usa `createHttpLogger` (Express) ou Fastify com logger built-in, e também `LogInterceptor`, os requests podem ser logados duas vezes. Usar `skipRequestLogging: true` ou `skipResponseLogging: true` no `LogInterceptor` para evitar duplicação.

### `pino-pretty` não está sendo usado em desenvolvimento

Instalar como devDependency no projeto consumidor:

```bash
pnpm add -D pino-pretty
```

A lib detecta automaticamente via `require.resolve`.

---

## Referência da API

### `createPinoLogger(config, destination?)`

Cria um `pino.Logger` configurado para Datadog.

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `serviceName` | `string` | `DD_SERVICE \| SERVICE_NAME \| 'app'` | Nome do serviço em todos os logs |
| `environment` | `LogEnvironment` | `DD_ENV \| NODE_ENV \| 'development'` | Ambiente de deploy |
| `logLevel` | `LogLevel` | `'info'` | Nível mínimo de log |
| `correlationMode` | `CorrelationMode` | `'none'` | Modo de injeção de trace/span IDs |
| `customSilentRoutes` | `string[]` | `[]` | Rotas extras a silenciar no HTTP access log |
| `customRedactPaths` | `string[]` | `[]` | Campos extras a redactar |
| `customFormatters` | `object` | — | Formatters customizados de level e log |
| `customSerializers` | `object` | — | Serializers customizados de req, res, err |

Retorna: `pino.Logger`

---

### `createHttpLogger(logger, config?)`

Cria middleware Express de HTTP access log baseado em `pino-http`.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `logger` | `pino.Logger` | Logger root criado por `createPinoLogger` |
| `config.customSilentRoutes` | `string[]` | Rotas extras a silenciar |

Comportamento por status code:
- **2xx / 3xx** em rotas silenciadas → `silent` (não logado)
- **4xx** em rotas silenciadas → `warn`
- **4xx** em rotas normais → `warn`
- **5xx** → `error`
- **Erro de request** → `error`
- **2xx / 3xx** em rotas normais → `info`

---

### `createNestPinoLoggerService(rootLogger, defaultContext?)`

Cria um `LoggerService` do NestJS que delega para Pino. Usado no `NestFactory.create`.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `rootLogger` | `pino.Logger` | Logger root criado por `createPinoLogger` |
| `defaultContext` | `string` | Contexto padrão quando não informado na chamada |

Retorna: `LoggerService`

Mapeamento de métodos NestJS → Pino:

| NestJS | Pino |
|--------|------|
| `log()` | `info()` |
| `error()` | `error()` |
| `warn()` | `warn()` |
| `debug()` | `debug()` |
| `verbose()` | `trace()` |
| `fatal()` | `fatal()` |

---

### `createPinoLogWriter(rootLogger, context?)`

Cria um `LogWriter` para usar em interceptors, guards e filters.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `rootLogger` | `pino.Logger` | Logger root criado por `createPinoLogger` |
| `context` | `string` | Contexto bound no child logger |

Retorna: `LogWriter`

---

### `buildFastifyLoggerOptions(logger)`

Retorna o objeto de opções para passar ao construtor do Fastify.

```typescript
const app = Fastify(buildFastifyLoggerOptions(logger))
// equivalente a: Fastify({ logger })
```

---

### `buildFastifyLoggerOptionsQuiet(logger)`

Retorna opções para Fastify com request logging desabilitado.

```typescript
const app = Fastify(buildFastifyLoggerOptionsQuiet(logger))
// equivalente a: Fastify({ logger, disableRequestLogging: true })
```

---

### `pinoLogContext`

Helpers para construir objetos de contexto estruturados.

```typescript
pinoLogContext.request(req, additionalData?)     // contexto de request Express
pinoLogContext.error(error, context?)             // contexto de erro
pinoLogContext.performance(operation, duration, metadata?)  // contexto de performance
pinoLogContext.proxy(target, service, metadata?)  // contexto de chamada externa
```

---

### Interface `LogWriter`

Interface genérica de escrita estruturada. Implementada por `createPinoLogWriter` e pelo wrapper de fallback do Nest Logger.

```typescript
interface LogWriter {
  info:  (message: string, context?: Record<string, unknown>) => void
  warn:  (message: string, context?: Record<string, unknown>) => void
  error: (message: string, context?: Record<string, unknown>) => void
  debug: (message: string, context?: Record<string, unknown>) => void
  trace: (message: string, context?: Record<string, unknown>) => void
  fatal: (message: string, context?: Record<string, unknown>) => void
}
```

---

### Tipos exportados

```typescript
import type {
  PinoLoggerConfig,   // config de createPinoLogger
  LogLevel,           // 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  CorrelationMode,    // 'datadog' | 'otel' | 'none'
  LogEnvironment,     // 'development' | 'staging' | 'production' | 'local' | 'test'
  LogWriter,          // interface genérica de log estruturado
  LogInterceptorOptions,     // opções do LogInterceptor NestJS
  LogGuardOptions,           // opções do LogGuard NestJS
  LogExceptionFilterOptions, // opções do LogExceptionFilter NestJS
} from '@starbemtech/star-node-stack-helper'
```
