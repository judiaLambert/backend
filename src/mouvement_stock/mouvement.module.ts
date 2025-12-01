import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MouvementStockController } from './mouvement.controller';
import { MouvementStockService } from './mouvement.service';
import { MouvementStock } from './mouvement.entity';
import { Inventaire } from '../inventaire/inventaire.entity';
import { JournalModule } from '../journal/journal.module';
import { Materiel } from '../materiel/materiel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MouvementStock, Inventaire, Materiel]),JournalModule
  ],
  controllers: [MouvementStockController],
  providers: [MouvementStockService],
  exports: [MouvementStockService], 
})
export class MouvementStockModule {}
