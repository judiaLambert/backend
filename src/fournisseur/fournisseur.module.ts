import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fournisseur } from './fournisseur.entity';
import { FournisseurService } from './fournisseur.service';
import { FournisseurController } from './fournisseur.controller';
import { TypeMateriel } from '../typemateriel/typemateriel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fournisseur, TypeMateriel])],
  providers: [FournisseurService],
  controllers: [FournisseurController],
})
export class FournisseurModule {}