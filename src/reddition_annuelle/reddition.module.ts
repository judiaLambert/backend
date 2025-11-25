import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedditionAnnuelle } from './reddition.entity';
import { RedditionAnnuelleService } from './reddition.service';
import { RedditionAnnuelleController } from './reddition.controller';
import { GrandLivre } from '../grand_livre/livre.entity';
import { Inventaire } from '../inventaire/inventaire.entity';


@Module({
  imports: [TypeOrmModule.forFeature([RedditionAnnuelle, GrandLivre, Inventaire])],
  providers: [RedditionAnnuelleService],
  controllers: [RedditionAnnuelleController],
  exports: [RedditionAnnuelleService],
})
export class RedditionAnnuelleModule {}
