import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetailApprovisionnementController } from './detailappro.controller';
import { DetailApprovisionnementService } from './detailappro.service';
import { DetailApprovisionnement } from './detailappro.entity';
import { InventaireModule } from '../inventaire/inventaire.module';
import { MouvementStockModule } from '../mouvement_stock/mouvement.module'; // ✅

@Module({
  imports: [
    TypeOrmModule.forFeature([DetailApprovisionnement]),
    InventaireModule,
    MouvementStockModule, // ✅
  ],
  controllers: [DetailApprovisionnementController],
  providers: [DetailApprovisionnementService],
  exports: [DetailApprovisionnementService],
})
export class DetailApprovisionnementModule {}
