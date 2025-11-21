import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultatRecensementController } from './resultat.controller';
import { ResultatRecensementService } from './resultat.service';
import { ResultatRecensement } from './resultat.entity';
import { Inventaire } from '../inventaire/inventaire.entity';
import { MouvementStockModule } from '../mouvement_stock/mouvement.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([ResultatRecensement, Inventaire]),
    MouvementStockModule, 
  ],
  controllers: [ResultatRecensementController],
  providers: [ResultatRecensementService],
  exports: [ResultatRecensementService],
})
export class ResultatRecensementModule {}
