import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepannageController } from './depannage.controller';
import { DepannageService } from './depannage.service';
import { Depannage } from './depannage.entity';
import { MaterielModule } from '../materiel/materiel.module';
import { MouvementStockModule } from '../mouvement_stock/mouvement.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Depannage]),
    MaterielModule,
    MouvementStockModule, 
  ],
  controllers: [DepannageController],
  providers: [DepannageService],
  exports: [DepannageService],
})
export class DepannageModule {}
