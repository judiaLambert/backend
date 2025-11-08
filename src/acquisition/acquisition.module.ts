import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Acquisition } from './acquisition.entity';
import { AcquisitionService } from './acquisition.service';
import { AcquisitionController } from './acquisition.controller';
import { Fournisseur } from '../fournisseur/fournisseur.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Acquisition, Fournisseur])],
  providers: [AcquisitionService],
  controllers: [AcquisitionController],
})
export class AcquisitionModule {}