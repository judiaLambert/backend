import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovisionnementService } from './approvisionnement.service';
import { ApprovisionnementController } from './approvisionnement.controller';
import { Approvisionnement } from './aprrovisionnement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Approvisionnement])],
  controllers: [ApprovisionnementController],
  providers: [ApprovisionnementService],
  exports: [ApprovisionnementService, TypeOrmModule],  // ✅ Exporter
})
export class ApprovisionnementModule {}
