import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrandLivre } from './livre.entity';
import { GrandLivreService } from './livre.service';
import { GrandLivreController } from './livre.controller';
import { Journal } from '../journal/journal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GrandLivre, Journal])],
  providers: [GrandLivreService],
  controllers: [GrandLivreController],
  exports: [GrandLivreService],
})
export class GrandLivreModule {}
