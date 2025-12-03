import { Module ,forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventaireController } from './inventaire.controller';
import { InventaireService } from './inventaire.service';
import { Inventaire } from './inventaire.entity';
import { Materiel } from '../materiel/materiel.entity';
import { MouvementStockModule } from '../mouvement_stock/mouvement.module'; 
import { DetailApprovisionnement } from '../detail_approvisionnement/detailappro.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventaire, Materiel,DetailApprovisionnement]),
    forwardRef(() => MouvementStockModule),
  ],
  controllers: [InventaireController],
  providers: [InventaireService],
  exports: [InventaireService],
})
export class InventaireModule {}
