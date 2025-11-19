import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetailApprovisionnementController } from './detailappro.controller';
import { DetailApprovisionnementService } from './detailappro.service';
import { DetailApprovisionnement } from './detailappro.entity';
import { InventaireModule } from '../inventaire/inventaire.module'; // ← IMPORTER

@Module({
  imports: [
    TypeOrmModule.forFeature([DetailApprovisionnement]),
    InventaireModule, // ← AJOUTER pour pouvoir utiliser InventaireService
  ],
  controllers: [DetailApprovisionnementController],
  providers: [DetailApprovisionnementService],
  exports: [DetailApprovisionnementService],
})
export class DetailApprovisionnementModule {}
