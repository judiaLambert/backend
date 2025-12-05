import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FicheDetenteurService } from './fiche.service';
import { FicheDetenteurController } from './fiche.controller';
import { Attribution } from '../attribution/attribution.entity';
import { Demandeur } from '../demandeur/demandeur.entity';
import { Materiel } from '../materiel/materiel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attribution, Demandeur, Materiel]),
  ],
  controllers: [FicheDetenteurController],
  providers: [FicheDetenteurService],
  exports: [FicheDetenteurService],
})
export class FicheDetenteurModule {}