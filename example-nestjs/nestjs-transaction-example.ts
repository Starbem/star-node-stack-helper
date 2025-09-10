import {
  Module,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseInterceptors,
} from '@nestjs/common'
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core'
import {
  ElasticLogger,
  LoggerConfig,
  AutoTransactionLogInterceptor,
  TransactionLogInterceptor,
  TransactionLog,
} from '../src'

// ============================================================================
// CONFIGURAÇÃO DO ELASTIC LOGGER
// ============================================================================

const elasticConfig: LoggerConfig = {
  node: 'https://your-opensearch-endpoint.com',
  service: 'nestjs-example',
  environment: 'development',
  index: 'transaction-logs',
  region: 'us-east-1',
  authType: 'aws',
}

const elasticLogger = new ElasticLogger(elasticConfig)

// ============================================================================
// CONFIGURAÇÃO DO INTERCEPTOR AUTOMÁTICO
// ============================================================================

const autoTransactionInterceptor = new AutoTransactionLogInterceptor(
  new Reflector(),
  {
    elasticLogger,
    defaultMicroservice: 'nestjs-example',
    skipTransactionLogging: false,
  }
)

// ============================================================================
// CONTROLLER COM EXEMPLOS DE TRANSACTION LOGGING
// ============================================================================

@Controller('users')
@UseInterceptors(autoTransactionInterceptor)
export class UsersController {
  @Get()
  @TransactionLog({
    microservice: 'user-service',
    operation: 'get-all-users',
  })
  async findAll() {
    // Simular busca de usuários
    return [
      { id: 1, name: 'João Silva', email: 'joao@example.com' },
      { id: 2, name: 'Maria Santos', email: 'maria@example.com' },
    ]
  }

  @Get(':id')
  @TransactionLog({
    microservice: 'user-service',
    operation: 'get-user-by-id',
  })
  async findOne(@Param('id') id: string) {
    // Simular busca de usuário específico
    return { id: parseInt(id), name: 'João Silva', email: 'joao@example.com' }
  }

  @Post()
  @TransactionLog({
    microservice: 'user-service',
    operation: 'create-user',
  })
  async create(@Body() createUserDto: any) {
    // Simular criação de usuário
    const newUser = {
      id: Math.floor(Math.random() * 1000),
      ...createUserDto,
      createdAt: new Date().toISOString(),
    }
    return newUser
  }

  @Put(':id')
  @TransactionLog({
    microservice: 'user-service',
    operation: 'update-user',
  })
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    // Simular atualização de usuário
    return {
      id: parseInt(id),
      ...updateUserDto,
      updatedAt: new Date().toISOString(),
    }
  }

  @Delete(':id')
  @TransactionLog({
    microservice: 'user-service',
    operation: 'delete-user',
  })
  async remove(@Param('id') id: string) {
    // Simular remoção de usuário
    return { message: `User ${id} deleted successfully` }
  }
}

@Controller('auth')
@UseInterceptors(autoTransactionInterceptor)
export class AuthController {
  @Post('login')
  @TransactionLog({
    microservice: 'auth-service',
    operation: 'user-login',
  })
  async login(@Body() loginDto: any) {
    // Simular login
    return {
      token: 'jwt-token-here',
      user: { id: 1, email: loginDto.email },
    }
  }

  @Post('register')
  @TransactionLog({
    microservice: 'auth-service',
    operation: 'user-registration',
  })
  async register(@Body() registerDto: any) {
    // Simular registro
    return {
      message: 'User registered successfully',
      user: { id: Math.floor(Math.random() * 1000), email: registerDto.email },
    }
  }

  @Post('logout')
  @TransactionLog({
    microservice: 'auth-service',
    operation: 'user-logout',
  })
  async logout() {
    // Simular logout
    return { message: 'Logged out successfully' }
  }
}

@Controller('payments')
@UseInterceptors(autoTransactionInterceptor)
export class PaymentsController {
  @Post('process')
  @TransactionLog({
    microservice: 'payment-service',
    operation: 'process-payment',
  })
  async processPayment(@Body() paymentDto: any) {
    // Simular processamento de pagamento
    return {
      transactionId: `pay_${Date.now()}`,
      status: 'completed',
      amount: paymentDto.amount,
    }
  }

  @Post('refund')
  @TransactionLog({
    microservice: 'payment-service',
    operation: 'process-refund',
  })
  async processRefund(@Body() refundDto: any) {
    // Simular processamento de reembolso
    return {
      refundId: `ref_${Date.now()}`,
      status: 'completed',
      amount: refundDto.amount,
    }
  }
}

@Controller('appointments')
@UseInterceptors(autoTransactionInterceptor)
export class AppointmentsController {
  @Post()
  @TransactionLog({
    microservice: 'appointment-service',
    operation: 'create-appointment',
  })
  async createAppointment(@Body() appointmentDto: any) {
    // Simular criação de agendamento
    return {
      id: Math.floor(Math.random() * 1000),
      ...appointmentDto,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    }
  }

  @Put(':id/cancel')
  @TransactionLog({
    microservice: 'appointment-service',
    operation: 'cancel-appointment',
  })
  async cancelAppointment(@Param('id') id: string) {
    // Simular cancelamento de agendamento
    return {
      id: parseInt(id),
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    }
  }
}

@Controller('video')
@UseInterceptors(autoTransactionInterceptor)
export class VideoController {
  @Post('rooms')
  @TransactionLog({
    microservice: 'video-service',
    operation: 'create-video-room',
  })
  async createVideoRoom(@Body() roomDto: any) {
    // Simular criação de sala de vídeo
    return {
      roomId: `room_${Date.now()}`,
      ...roomDto,
      status: 'active',
      createdAt: new Date().toISOString(),
    }
  }

  @Post('rooms/:id/join')
  @TransactionLog({
    microservice: 'video-service',
    operation: 'join-video-room',
  })
  async joinVideoRoom(@Param('id') id: string, @Body() joinDto: any) {
    // Simular entrada em sala de vídeo
    return {
      roomId: id,
      userId: joinDto.userId,
      token: 'video-token-here',
      joinedAt: new Date().toISOString(),
    }
  }
}

// ============================================================================
// EXEMPLO DE USO COM INTERCEPTOR MANUAL
// ============================================================================

@Controller('manual-transactions')
export class ManualTransactionController {
  private readonly transactionInterceptor = new TransactionLogInterceptor({
    microservice: 'manual-service',
    operation: 'manual-operation',
    elasticLogger,
  })

  @Get('example')
  @UseInterceptors(this.transactionInterceptor)
  async manualExample() {
    // Este método usará o interceptor manual
    return { message: 'Manual transaction logged' }
  }

  @Post('custom')
  @TransactionLog({
    microservice: 'custom-service',
    operation: 'custom-operation',
    customContext: { customField: 'custom-value' },
  })
  @UseInterceptors(autoTransactionInterceptor)
  async customTransaction(@Body() data: any) {
    // Este método usará o interceptor automático com contexto customizado
    return { message: 'Custom transaction logged', data }
  }
}

// ============================================================================
// MÓDULO PRINCIPAL
// ============================================================================

@Module({
  controllers: [
    UsersController,
    AuthController,
    PaymentsController,
    AppointmentsController,
    VideoController,
    ManualTransactionController,
  ],
  providers: [
    // Interceptor global para transaction logging
    {
      provide: APP_INTERCEPTOR,
      useValue: autoTransactionInterceptor,
    },
  ],
})
export class AppModule {}

// ============================================================================
// EXEMPLO DE USO EM SERVIÇOS
// ============================================================================

import { Injectable } from '@nestjs/common'

@Injectable()
export class UserService {
  @TransactionLog({
    microservice: 'user-service',
    operation: 'validate-user-data',
  })
  async validateUserData(userData: any): Promise<boolean> {
    // Simular validação
    return userData.email && userData.name
  }

  @TransactionLog({
    microservice: 'user-service',
    operation: 'process-user-data',
  })
  async processUserData(userData: any): Promise<any> {
    // Simular processamento
    await new Promise((resolve) => setTimeout(resolve, 100))
    return { ...userData, processed: true }
  }
}

// ============================================================================
// EXEMPLO DE CONFIGURAÇÃO AVANÇADA
// ============================================================================

@Controller('advanced')
export class AdvancedController {
  // Interceptor com configuração específica
  private readonly specificInterceptor = new TransactionLogInterceptor({
    microservice: 'advanced-service',
    operation: 'advanced-operation',
    elasticLogger,
    skipTransactionLogging: false,
    customContext: (context) => ({
      controller: 'AdvancedController',
      timestamp: new Date().toISOString(),
    }),
  })

  @Get('specific')
  @UseInterceptors(this.specificInterceptor)
  async specificOperation() {
    return { message: 'Specific operation with custom interceptor' }
  }

  @Post('conditional')
  @TransactionLog({
    microservice: 'conditional-service',
    operation: 'conditional-operation',
    skipTransactionLogging: false, // Pode ser controlado dinamicamente
  })
  @UseInterceptors(autoTransactionInterceptor)
  async conditionalOperation(@Body() data: any) {
    // O logging será feito apenas se skipTransactionLogging for false
    return { message: 'Conditional operation', data }
  }
}
