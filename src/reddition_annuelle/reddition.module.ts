import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedditionAnnuelleController } from './reddition.controller';
import { RedditionAnnuelleService } from './reddition.service';
import { RedditionAnnuelle } from './reddition.entity';
import { GrandLivre } from '../grand_livre/livre.entity';
import { ResultatRecensement } from '../resultat_recensement/resultat.entity'; // ✅ Ajouté

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RedditionAnnuelle,
      GrandLivre,
      ResultatRecensement, // ✅ Ajouté (au lieu de Inventaire)
    ]),
  ],
  controllers: [RedditionAnnuelleController],
  providers: [RedditionAnnuelleService],
  exports: [RedditionAnnuelleService],
})
export class RedditionAnnuelleModule {}
