import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributionController } from './attribution.controller';
import { AttributionService } from './attribution.service';
import { Attribution } from './attribution.entity';
import { Materiel } from '../materiel/materiel.entity';
import { Demandeur } from '../demandeur/demandeur.entity';
import { MouvementStockModule } from '../mouvement_stock/mouvement.module';
import { InventaireModule } from '../inventaire/inventaire.module';
import { DemandeMateriel } from '../demande_materiel/demande.entity';  
import { DetailDemande } from '../detail_demande/detail.entity';  


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attribution,
      Materiel,       
      Demandeur,     
      DemandeMateriel,
      DetailDemande 
    ]),
    forwardRef(() => MouvementStockModule),
    forwardRef(() => InventaireModule),
  ],
  controllers: [AttributionController],
  providers: [AttributionService],
  exports: [AttributionService],
})
export class AttributionModule {}
