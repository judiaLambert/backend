import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultatRecensement } from './resultat.entity';
import { ResultatRecensementService } from './resultat.service';
import { ResultatRecensementController } from './resultat.controller';
import { Inventaire } from '../inventaire/inventaire.entity';
import { DetailApprovisionnement } from '../detail_approvisionnement/detailappro.entity'; // ✅
import { MouvementStockModule } from '../mouvement_stock/mouvement.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResultatRecensement,
      Inventaire,
      DetailApprovisionnement, 
    ]),
    MouvementStockModule, 
  ],
  controllers: [ResultatRecensementController],
  providers: [ResultatRecensementService],
  exports: [ResultatRecensementService],
})
export class ResultatRecensementModule {}
