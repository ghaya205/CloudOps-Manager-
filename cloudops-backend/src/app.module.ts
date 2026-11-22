import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AlertRulesModule } from './alert-rules/alert-rules.module.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { validateEnv } from './config/env.validation.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthController } from './health/health.controller.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ServersModule } from './servers/servers.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { UsersModule } from './users/users.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'cloudops-backend',
    }),
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // NFR-3: generic rate limit; the login route has a stricter one.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    ProjectsModule,
    ServersModule,
    ApplicationsModule,
    MetricsModule,
    AlertRulesModule,
    AlertsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    // Guards run in this order on every route: rate limit, then JWT identity, then role.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // FR-X2: every DTO is validated; unknown fields are rejected with field-level messages.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    // FR-X3: one error format for the whole API.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
