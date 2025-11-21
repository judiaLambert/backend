import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventaireController } from './inventaire.controller';
import { InventaireService } from './inventaire.service';
import { Inventaire } from './inventaire.entity';
import { Materiel } from '../materiel/materiel.entity';
import { MouvementStockModule } from '../mouvement_stock/mouvement.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventaire, Materiel]),
    MouvementStockModule, 
  ],
  controllers: [InventaireController],
  providers: [InventaireService],
  exports: [InventaireService],
})
export class InventaireModule {}
