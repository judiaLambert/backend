import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Approvisionnement } from './aprrovisionnement.entity';
import { ApprovisionnementService } from './approvisionnement.service';
import { ApprovisionnementController } from './approvisionnement.controller';
import { Acquisition } from '../acquisition/acquisition.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Approvisionnement, Acquisition])],
  providers: [ApprovisionnementService],
  controllers: [ApprovisionnementController],
})
export class ApprovisionnementModule {}