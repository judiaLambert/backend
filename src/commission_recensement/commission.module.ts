import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';
import { CommissionRecensement } from './commission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CommissionRecensement])],
  controllers: [CommissionController],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
