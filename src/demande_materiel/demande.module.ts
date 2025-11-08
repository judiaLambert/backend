import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemandeMaterielController } from './demande.controller';
import { DemandeMaterielService } from './demande.service';
import { DemandeMateriel } from './demande.entity';
import { Demandeur } from '../demandeur/demandeur.entity'; 
import { DetailDemandeService } from 'src/detail_demande/detail.service';
import { DetailDemande } from 'src/detail_demande/detail.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DemandeMateriel, Demandeur, DetailDemande]), 
  ],
  controllers: [DemandeMaterielController],
  providers: [DemandeMaterielService,DetailDemandeService],
  exports: [DemandeMaterielService],
})
export class DemandeModule {}