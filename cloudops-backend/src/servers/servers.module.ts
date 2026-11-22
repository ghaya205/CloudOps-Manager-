import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module.js';
import { ServersController } from './servers.controller.js';
import { ServersService } from './servers.service.js';

@Module({
  imports: [MetricsModule],
  controllers: [ServersController],
  providers: [ServersService],
})
export class ServersModule {}
