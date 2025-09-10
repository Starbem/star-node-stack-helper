import {
  Module,
  Controller,
  Get,
  Post,
  UseInterceptors,
  Body,
  Param,
} from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { ElasticLogger, LoggerConfig, TransactionLogInterceptor } from '../src'

// ============================================================================
// CONFIGURAÇÃO BÁSICA
// ============================================================================

const elasticConfig: LoggerConfig = {
  node: 'https://your-opensearch-endpoint.com',
  service: 'my-service',
  environment: 'development',
  index: 'transaction-logs',
  region: 'us-east-1',
  authType: 'aws',
}

const elasticLogger = new ElasticLogger(elasticConfig)

// ============================================================================
// INTERCEPTOR GLOBAL
// ============================================================================

const autoTransactionInterceptor = new TransactionLogInterceptor({
  microservice: 'my-service',
  operation: 'api-request',
  elasticLogger,
})

// ============================================================================
// EXEMPLO DE USO SIMPLES
// ============================================================================

@Controller('api')
@UseInterceptors(autoTransactionInterceptor)
export class ApiController {
  @Get('users')
  async getUsers(): Promise<any> {
    return [
      { id: 1, name: 'João' },
      { id: 2, name: 'Maria' },
    ]
  }

  @Post('users')
  async createUser(@Body() userData: any): Promise<any> {
    return {
      id: Math.floor(Math.random() * 1000),
      ...userData,
      createdAt: new Date().toISOString(),
    }
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string): Promise<any> {
    return { id: parseInt(id), name: 'João Silva' }
  }
}

// ============================================================================
// MÓDULO PRINCIPAL
// ============================================================================

@Module({
  controllers: [ApiController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useValue: autoTransactionInterceptor,
    },
  ],
})
export class AppModule {}

// ============================================================================
// EXEMPLO DE USO COM CONTEXTO CUSTOMIZADO
// ============================================================================

@Controller('custom')
@UseInterceptors(autoTransactionInterceptor)
export class CustomController {
  @Post('process')
  async processData(@Body() data: any): Promise<any> {
    // O contexto customizado será incluído nos logs
    return { processed: true, data }
  }
}

// ============================================================================
// EXEMPLO DE USO SEM DECORATOR (INTERCEPTOR GLOBAL)
// ============================================================================

@Controller('global')
@UseInterceptors(autoTransactionInterceptor)
export class GlobalController {
  @Get('health')
  // Sem decorator - não fará transaction logging
  async health(): Promise<any> {
    return { status: 'ok' }
  }

  @Get('status')
  async status(): Promise<any> {
    return { status: 'running', uptime: process.uptime() }
  }
}
