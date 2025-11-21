import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttributionController } from './attribution.controller';
import { AttributionService } from './attribution.service';
import { Attribution } from './attribution.entity';
import { DemandeMateriel } from '../demande_materiel/demande.entity';
import { DetailDemande } from '../detail_demande/detail.entity';
import { InventaireModule } from '../inventaire/inventaire.module';
import { MouvementStockModule } from '../mouvement_stock/mouvement.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Attribution, DemandeMateriel, DetailDemande]),
    InventaireModule,
    MouvementStockModule, 
  ],
  controllers: [AttributionController],
  providers: [AttributionService],
  exports: [AttributionService],
})
export class AttributionModule {}
