import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemandeMaterielController } from './demande.controller';
import { DemandeMaterielService } from './demande.service';
import { DemandeMateriel } from './demande.entity';
import { Demandeur } from '../demandeur/demandeur.entity'; 
@Module({
  imports: [
    TypeOrmModule.forFeature([DemandeMateriel, Demandeur]), 
  ],
  controllers: [DemandeMaterielController],
  providers: [DemandeMaterielService],
  exports: [DemandeMaterielService],
})
export class DemandeModule {}