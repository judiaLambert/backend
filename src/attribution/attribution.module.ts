import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributionController } from './attribution.controller';
import { AttributionService } from './attribution.service';
import { Attribution } from './attribution.entity';
import { DetailDemande } from '../detail_demande/detail.entity';  // ← AJOUTER
import { Materiel } from '../materiel/materiel.entity';
import { Demandeur } from '../demandeur/demandeur.entity';
import { DemandeMateriel } from '../demande_materiel/demande.entity';


@Module({
  imports: [TypeOrmModule.forFeature([Attribution, DetailDemande,        // ← AJOUTER ICI
      Materiel,
      Demandeur,
      DemandeMateriel])],
  controllers: [AttributionController],
  providers: [AttributionService],
})
export class AttributionModule {}