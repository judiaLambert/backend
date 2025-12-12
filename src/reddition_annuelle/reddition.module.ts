// src/reddition_annuelle/reddition.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedditionAnnuelleService } from './reddition.service';
import { RedditionAnnuelleController } from './reddition.controller';
import { RedditionAnnuelle } from './reddition.entity';
import { GrandLivre } from '../grand_livre/livre.entity';
import { ResultatRecensement } from '../resultat_recensement/resultat.entity';
// ✅ NOUVEAU : Import des entités Attribution et Depannage
import { Attribution } from '../attribution/attribution.entity';
import { Depannage } from '../depannage/depannage.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RedditionAnnuelle,
      GrandLivre,
      ResultatRecensement,
      Attribution,  // ✅ AJOUTÉ
      Depannage,    // ✅ AJOUTÉ
    ]),
  ],
  controllers: [RedditionAnnuelleController],
  providers: [RedditionAnnuelleService],
  exports: [RedditionAnnuelleService],
})
export class RedditionAnnuelleModule {}
