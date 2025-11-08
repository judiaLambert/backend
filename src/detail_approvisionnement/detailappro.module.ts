import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetailApprovisionnement } from './detailappro.entity';
import { DetailApprovisionnementService } from './detailappro.service';
import { DetailApprovisionnementController } from './detailappro.controller';
import { Materiel } from '../materiel/materiel.entity';
import { Approvisionnement } from '../approvisionnement/aprrovisionnement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DetailApprovisionnement, Materiel, Approvisionnement])],
  providers: [DetailApprovisionnementService],
  controllers: [DetailApprovisionnementController],
})
export class DetailApprovisionnementModule {}